/* Large CMS uploads: store blobs separately, then advance the branch atomically.
 * Sveltia 0.266.0 sends a single large asset in one GraphQL request (issues #1012, #1084).
 * Keep the pinned CMS version and this request/response contract in sync when upgrading.
 */
(function () {
  'use strict';
  const nativeFetch = window.fetch.bind(window);
  const api = 'https://api.github.com';
  const graphql = api + '/graphql';
  const repository = 'svetlana18011991/shkatulka-math';
  const minimumPayload = 8 * 1024 * 1024;
  const maximumFileSize = 100 * 1024 * 1024;
  const aliasPattern = /\b(file_\d+)\s*:\s*file\s*\(\s*path\s*:\s*("(?:[^"\\]|\\.)*")\s*\)\s*\{\s*oid\s*\}/g;
  const knownMutation = 'mutation($input:CreateCommitOnBranchInput!){createCommitOnBranch(input:$input){commit{oidcommittedDate}}}';

  function getCommitRequest(resource, options) {
    if (String(resource) !== graphql || String(options?.method || 'GET').toUpperCase() !== 'POST' ||
        typeof options.body !== 'string' || options.body.length < minimumPayload) return null;
    try {
      const payload = JSON.parse(options.body);
      const aliases = [];
      const query = payload.query.replace(aliasPattern, (_, alias, path) => {
        aliases.push({ alias, path:JSON.parse(path) });
        return '';
      }).replace(/\s+/g, '');
      const input = payload.variables?.input;
      if (query !== knownMutation || input?.branch?.repositoryNameWithOwner !== repository ||
          input.branch.branchName !== 'main' || !/^[a-f\d]{40}$/.test(input.expectedHeadOid)) return null;
      const additions = input.fileChanges?.additions;
      const deletions = input.fileChanges?.deletions || [];
      if (!Array.isArray(additions) || !additions.length || !Array.isArray(deletions) ||
          additions.some(file => typeof file.path !== 'string' || typeof file.contents !== 'string') ||
          deletions.some(file => typeof file.path !== 'string')) return null;
      const paths = new Set(additions.map(file => file.path));
      if (aliases.some(file => !paths.has(file.path)) || typeof input.message?.headline !== 'string') return null;
      return { input, aliases, additions, deletions };
    } catch (_) { return null; }
  }

  async function saveWithSeparateBlobs(request, options) {
    const { input, aliases, additions, deletions } = request;
    const prefix = api + '/repos/' + repository;
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/vnd.github+json');
    headers.set('Content-Type', 'application/json');
    headers.set('X-GitHub-Api-Version', '2022-11-28');

    async function send(url, method, body, operation) {
      let response;
      try {
        response = await nativeFetch(url, {
          ...options, method, headers:url === graphql ? options.headers : headers,
          body:body === undefined ? undefined : JSON.stringify(body),
        });
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        throw new Error(operation + ': соединение с GitHub прервано. Проверьте подключение и повторите сохранение.');
      }
      let data;
      try { data = await response.json(); }
      catch (_) { throw new Error(operation + ': GitHub вернул неожиданный ответ (HTTP ' + response.status + ').'); }
      if (!response.ok || data.errors?.length) {
        const detail = data.errors?.map(error => error.message).join('; ') || data.message || ('HTTP ' + response.status);
        throw new Error(operation + ': ' + detail);
      }
      return data;
    }

    // Reject oversize files before creating any Git objects.
    additions.forEach(file => {
      const padding = file.contents.endsWith('==') ? 2 : file.contents.endsWith('=') ? 1 : 0;
      const size = Math.floor(file.contents.length / 4) * 3 - padding;
      if (size > maximumFileSize) throw new Error('Файл «' + file.path + '» больше 100 МБ. Используйте поле «Видеообзор — ссылка».');
    });

    const head = await send(prefix + '/git/ref/heads/main', 'GET', undefined, 'Проверка версии каталога');
    if (head.object?.sha !== input.expectedHeadOid) {
      throw new Error('Каталог уже изменился на GitHub. Сохранение остановлено, чтобы сохранить чужие правки. Повторите сохранение после проверки изменений.');
    }
    const repo = await send(prefix, 'GET', undefined, 'Проверка репозитория');
    const parent = await send(prefix + '/git/commits/' + input.expectedHeadOid, 'GET', undefined, 'Чтение текущей версии');
    if (!repo.node_id || !parent.tree?.sha) throw new Error('Не удалось определить текущую версию каталога на GitHub.');

    const blobs = new Map();
    for (const file of additions) {
      const blob = await send(prefix + '/git/blobs', 'POST', {
        encoding:'base64', content:file.contents,
      }, 'Загрузка файла «' + file.path + '»');
      if (!blob.sha) throw new Error('GitHub не подтвердил загрузку файла «' + file.path + '».');
      blobs.set(file.path, blob.sha);
    }
    const entries = new Map();
    deletions.forEach(file => entries.set(file.path, { path:file.path, mode:'100644', type:'blob', sha:null }));
    // A replacement can appear in both lists; its new contents take precedence.
    blobs.forEach((sha, path) => entries.set(path, { path, mode:'100644', type:'blob', sha }));
    const tree = await send(prefix + '/git/trees', 'POST', {
      base_tree:parent.tree.sha, tree:[...entries.values()],
    }, 'Подготовка изменений');
    if (!tree.sha) throw new Error('GitHub не подтвердил подготовку изменений.');
    const created = await send(prefix + '/git/commits', 'POST', {
      message:input.message.headline + (input.message.body ? '\n\n' + input.message.body : ''),
      tree:tree.sha, parents:[input.expectedHeadOid],
    }, 'Подготовка сохранения');
    if (!created.sha || !created.committer?.date) throw new Error('GitHub не подтвердил новую версию каталога.');

    // This small compare-and-swap request refuses ANY concurrent head change.
    // No catalogue or media path changes until every upload has succeeded.
    const result = await send(graphql, 'POST', {
      query:'mutation($input: UpdateRefsInput!) { updateRefs(input: $input) { clientMutationId } }',
      variables:{ input:{ repositoryId:repo.node_id, refUpdates:[{
        name:'refs/heads/main', beforeOid:input.expectedHeadOid, afterOid:created.sha, force:false,
      }] } },
    }, 'Публикация изменений');
    if (!result.data?.updateRefs) throw new Error('GitHub не подтвердил публикацию изменений.');
    const commit = { oid:created.sha, committedDate:created.committer.date };
    aliases.forEach(({ alias, path }) => { commit[alias] = { oid:blobs.get(path) }; });
    return { data:{ createCommitOnBranch:{ commit } } };
  }

  window.fetch = async function (resource, options) {
    const request = getCommitRequest(resource, options);
    if (!request) return nativeFetch(resource, options);
    let response;
    try { response = await saveWithSeparateBlobs(request, options); }
    catch (error) {
      if (error.name === 'AbortError') throw error;
      response = { errors:[{ message:error.message || 'Не удалось сохранить видео на GitHub.' }] };
    }
    return new Response(JSON.stringify(response), { status:200, headers:{ 'Content-Type':'application/json' } });
  };
})();
