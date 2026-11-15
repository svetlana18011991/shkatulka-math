/* Run with: node --test tests/admin-github-upload.test.cjs */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const adapterPath = path.join(__dirname, '..', 'admin', 'github-upload.js');
const API = 'https://api.github.com';
const REPO = 'svetlana18011991/shkatulka-math';
const ROOT = `/repos/${REPO}`;
const EXPECTED = '1'.repeat(40);
const BASE_TREE = '2'.repeat(40);
const NEW_TREE = '3'.repeat(40);
const NEW_COMMIT = '4'.repeat(40);
const OTHER_COMMIT = '5'.repeat(40);
const DATE = '2026-11-15T13:00:00Z';
const TOKEN = 'Bearer fake-token-for-mocked-tests-only';
const videoBytes = Buffer.alloc(Math.floor(14.1 * 1024 * 1024));
for (let i = 0; i < videoBytes.length; i++) videoBytes[i] = i % 251;
const videoBase64 = videoBytes.toString('base64');
const productBytes = Buffer.from('{"items":[{"title":"Товар","videoReviewFile":"/videos/review.mp4"}]}\n');
const imageBytes = Buffer.from([0, 255, 13, 10, 128, 1, 2, 3]);

function gitBlobSha(bytes) {
  return crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

function payload(overrides = {}) {
  return {
    query: `mutation($input: CreateCommitOnBranchInput!) {
      createCommitOnBranch(input: $input) {
        commit {
          oid committedDate
          file_0: file(path: "products.json") { oid }
          file_2: file(path: "images/обзор.png") { oid }
        }
      }
    }`,
    variables: {
      input: {
        branch: { repositoryNameWithOwner: REPO, branchName: 'main' },
        expectedHeadOid: EXPECTED,
        message: { headline: 'Update База товаров', body: 'Видеообзор и изображение\nВторая строка' },
        fileChanges: {
          additions: [
            { path: 'products.json', contents: productBytes.toString('base64') },
            { path: 'videos/review.mp4', contents: videoBase64 },
            { path: 'images/обзор.png', contents: imageBytes.toString('base64') },
          ],
          deletions: [{ path: 'videos/old.mp4' }],
        },
        ...overrides,
      },
    },
  };
}

function requestOptions(body) {
  return {
    method: 'POST',
    headers: { authorization: TOKEN, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function install(fetch) {
  const window = { fetch, URL, Headers, Response, Request, AbortController, atob, btoa };
  const context = {
    window, URL, Headers, Response, Request, AbortController, atob, btoa,
    TextEncoder, TextDecoder, setTimeout, clearTimeout, console,
  };
  vm.runInNewContext(fs.readFileSync(adapterPath, 'utf8'), context, { filename: adapterPath });
  return window.fetch;
}

function githubMock({ head = EXPECTED, failBlobPath, raceAfterCommit = false, networkFailure = false } = {}) {
  const state = { calls: [], blobs: new Map(), head, committed: false, updated: false };
  const additionsByContents = new Map(payload().variables.input.fileChanges.additions.map(entry => [entry.contents, entry.path]));
  const json = (value, status = 200) => new Response(JSON.stringify(value), {
    status, headers: { 'content-type': 'application/json' },
  });
  const fetch = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    const method = options.method || 'GET';
    const headers = new Headers(options.headers);
    const body = options.body ? JSON.parse(options.body) : undefined;
    state.calls.push({ url, method, headers, body });
    assert.equal(url.origin, API, 'Never send credentials or media to another origin');
    assert.equal(headers.get('authorization'), TOKEN, 'Use the existing CMS session credentials');
    if (method === 'GET' && url.pathname === `${ROOT}/git/ref/heads/main`) {
      return json({ ref: 'refs/heads/main', object: { type: 'commit', sha: state.head } });
    }
    if (method === 'GET' && url.pathname === ROOT) return json({ node_id: 'R_TEST_REPOSITORY' });
    if (method === 'GET' && url.pathname === `${ROOT}/git/commits/${EXPECTED}`) {
      return json({ sha: EXPECTED, tree: { sha: BASE_TREE }, committer: { date: DATE } });
    }
    if (method === 'POST' && url.pathname === `${ROOT}/git/blobs`) {
      assert.equal(body.encoding, 'base64');
      const sourcePath = additionsByContents.get(body.content);
      if (sourcePath === failBlobPath) {
        if (networkFailure) throw new TypeError('Failed to fetch');
        return json({ message: 'The upload was rejected' }, 422);
      }
      const bytes = Buffer.from(body.content, 'base64');
      const sha = gitBlobSha(bytes);
      state.blobs.set(sha, bytes);
      return json({ sha, url: `${API}${ROOT}/git/blobs/${sha}` }, 201);
    }
    if (method === 'POST' && url.pathname === `${ROOT}/git/trees`) {
      assert.equal(body.base_tree, BASE_TREE, 'Preserve every unrelated repository file');
      return json({ sha: NEW_TREE }, 201);
    }
    if (method === 'POST' && url.pathname === `${ROOT}/git/commits`) {
      assert.deepEqual(body.parents, [EXPECTED], 'Do not overwrite concurrent branch changes');
      assert.equal(body.tree, NEW_TREE);
      state.committed = true;
      if (raceAfterCommit) state.head = OTHER_COMMIT;
      return json({ sha: NEW_COMMIT, committer: { date: DATE } }, 201);
    }
    if (method === 'POST' && url.pathname === '/graphql') {
      assert.ok(options.body.length < 8 * 1024 * 1024, 'The final GraphQL request contains no video data');
      assert.match(body.query, /updateRefs/);
      assert.equal(body.variables.input.repositoryId, 'R_TEST_REPOSITORY');
      const update = body.variables.input.refUpdates[0];
      assert.deepEqual(update, {
        name: 'refs/heads/main', beforeOid: EXPECTED, afterOid: NEW_COMMIT, force: false,
      });
      if (update.beforeOid !== state.head) return json({ errors: [{ message: 'Reference changed: beforeOid does not match' }] });
      state.head = update.afterOid;
      state.updated = true;
      return json({ data: { updateRefs: { clientMutationId: null } } });
    }
    throw new Error(`Unexpected GitHub call: ${method} ${url.pathname}`);
  };
  return { fetch, state };
}

test('14.1 MiB video and product edits are preserved byte for byte in one atomic commit', async () => {
  const mock = githubMock();
  const fetch = install(mock.fetch);
  const options = requestOptions(payload());
  assert.ok(options.body.length > 16 * 1024 * 1024, 'Exercise an actual oversized CMS request');
  const response = await fetch(`${API}/graphql`, options);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.errors, undefined);
  assert.equal(mock.state.updated, true);
  assert.equal(mock.state.head, NEW_COMMIT);
  assert.deepEqual(mock.state.blobs.get(gitBlobSha(videoBytes)), videoBytes);
  assert.deepEqual(mock.state.blobs.get(gitBlobSha(productBytes)), productBytes);
  assert.deepEqual(mock.state.blobs.get(gitBlobSha(imageBytes)), imageBytes);
  const tree = mock.state.calls.find(call => call.url.pathname === `${ROOT}/git/trees`).body;
  const entries = new Map(tree.tree.map(entry => [entry.path, entry]));
  assert.deepEqual(entries.get('videos/old.mp4'), { path: 'videos/old.mp4', mode: '100644', type: 'blob', sha: null });
  for (const [sourcePath, bytes] of [['products.json', productBytes], ['videos/review.mp4', videoBytes], ['images/обзор.png', imageBytes]]) {
    assert.deepEqual(entries.get(sourcePath), { path: sourcePath, mode: '100644', type: 'blob', sha: gitBlobSha(bytes) });
  }
  const commitRequest = mock.state.calls.find(call => call.method === 'POST' && call.url.pathname === `${ROOT}/git/commits`).body;
  assert.equal(commitRequest.message, 'Update База товаров\n\nВидеообзор и изображение\nВторая строка');
  assert.equal(commitRequest.author, undefined, 'GitHub should use the authenticated user');
  assert.equal(commitRequest.committer, undefined);
  assert.equal(result.data.createCommitOnBranch.commit.oid, NEW_COMMIT);
  assert.equal(result.data.createCommitOnBranch.commit.committedDate, DATE);
  assert.deepEqual(result.data.createCommitOnBranch.commit.file_0, { oid: gitBlobSha(productBytes) });
  assert.deepEqual(result.data.createCommitOnBranch.commit.file_2, { oid: gitBlobSha(imageBytes) });
  assert.equal(JSON.stringify(result).includes(TOKEN), false);
});

test('an addition wins over a deletion of the same file', async () => {
  const mock = githubMock();
  const body = payload();
  body.variables.input.fileChanges.deletions.push({ path: 'products.json' });
  const response = await install(mock.fetch)(`${API}/graphql`, requestOptions(body));
  assert.equal((await response.json()).errors, undefined);
  const tree = mock.state.calls.find(call => call.url.pathname === `${ROOT}/git/trees`).body.tree;
  assert.equal(tree.filter(entry => entry.path === 'products.json').length, 1);
  assert.equal(tree.find(entry => entry.path === 'products.json').sha, gitBlobSha(productBytes));
});

test('a stale initial branch head stops before any uploads or mutations', async () => {
  const mock = githubMock({ head: OTHER_COMMIT });
  const response = await install(mock.fetch)(`${API}/graphql`, requestOptions(payload()));
  const result = await response.json();
  assert.ok(result.errors?.length);
  assert.equal(result.data?.createCommitOnBranch, undefined);
  assert.equal(mock.state.head, OTHER_COMMIT);
  assert.equal(mock.state.calls.some(call => call.method === 'POST'), false);
});

test('a branch change during upload is rejected by exact beforeOid without replacing work', async () => {
  const mock = githubMock({ raceAfterCommit: true });
  const response = await install(mock.fetch)(`${API}/graphql`, requestOptions(payload()));
  const result = await response.json();
  assert.ok(result.errors?.length);
  assert.equal(result.data?.createCommitOnBranch, undefined);
  assert.equal(mock.state.committed, true);
  assert.equal(mock.state.updated, false);
  assert.equal(mock.state.head, OTHER_COMMIT);
});

for (const networkFailure of [false, true]) {
  test(`${networkFailure ? 'network' : 'HTTP'} blob failure never writes a tree, commit, or branch`, async () => {
    const mock = githubMock({ failBlobPath: 'videos/review.mp4', networkFailure });
    const response = await install(mock.fetch)(`${API}/graphql`, requestOptions(payload()));
    const result = await response.json();
    assert.ok(result.errors?.[0]?.message);
    assert.equal(result.data?.createCommitOnBranch, undefined);
    assert.equal(mock.state.committed, false);
    assert.equal(mock.state.updated, false);
    assert.equal(mock.state.calls.some(call => call.url.pathname === `${ROOT}/git/trees`), false);
    assert.equal(mock.state.calls.some(call => call.url.pathname === '/graphql'), false);
    assert.equal(mock.state.head, EXPECTED);
    assert.equal(JSON.stringify(result).includes(TOKEN), false);
  });
}

test('small requests and unrelated operations pass through without rewriting', async () => {
  const cases = [];
  const small = payload();
  small.variables.input.fileChanges.additions = [{ path: 'products.json', contents: 'e30=' }];
  cases.push({ name: 'small commit', url: `${API}/graphql`, body: small });
  const unknown = payload();
  unknown.query = 'mutation Unknown($input: JSON!) { customMutation(input: $input) { result } }';
  cases.push({ name: 'unknown large mutation', url: `${API}/graphql`, body: unknown });
  const named = payload();
  named.query = named.query.replace('mutation(', 'mutation NamedOperation(');
  cases.push({ name: 'unrecognized named mutation', url: `${API}/graphql`, body: named });
  const foreignRepo = payload();
  foreignRepo.variables.input.branch.repositoryNameWithOwner = 'someone-else/repo';
  cases.push({ name: 'different repository', url: `${API}/graphql`, body: foreignRepo });
  const foreignBranch = payload();
  foreignBranch.variables.input.branch.branchName = 'another-branch';
  cases.push({ name: 'different branch', url: `${API}/graphql`, body: foreignBranch });
  cases.push({ name: 'foreign origin', url: 'https://example.com/graphql', body: payload() });
  cases.push({ name: 'different GitHub endpoint', url: `${API}/something-else`, body: payload() });
  for (const fixture of cases) {
    const options = requestOptions(fixture.body);
    const nativeResponse = new Response('untouched', { status: 202 });
    let calls = 0;
    const fetch = install(async (input, init) => {
      calls++;
      assert.equal(input, fixture.url, fixture.name);
      assert.equal(init, options, `${fixture.name}: preserve original request options`);
      return nativeResponse;
    });
    assert.equal(await fetch(fixture.url, options), nativeResponse, fixture.name);
    assert.equal(calls, 1, fixture.name);
  }
});
