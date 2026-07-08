Патч добавляет:
1) сортировку в каталоге;
2) подготовленный код Яндекс.Метрики;
3) события по товарам: product_detail_click, product_card_open_click, product_buy_click, product_download_click, product_page_view.

Важно: чтобы события реально начали собираться, нужен номер счётчика Яндекс.Метрики.
Когда счётчик будет создан, в script.js нужно заменить строку:
window.SHKT_METRIKA_ID = window.SHKT_METRIKA_ID || '';
на:
window.SHKT_METRIKA_ID = window.SHKT_METRIKA_ID || 'ВАШ_НОМЕР_СЧЁТЧИКА';

Можно просто прислать номер счётчика — будет сделан маленький финальный патч.
