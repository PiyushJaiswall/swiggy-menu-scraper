// This code runs on your Vercel page, NOT on Swiggy.
// It just turns the button into a bookmarklet link.

const bookmarkletLink = document.getElementById("bookmarklet");

// The actual bookmarklet code that will run INSIDE swiggy.com
const bookmarkletCode = `javascript:(async ()=>{
  const entries = performance.getEntriesByType('resource');
  const menuReq = entries.find(e => e.name.includes('dapi/menu/pl'));

  if (!menuReq) {
    alert('Reload this Swiggy restaurant page once, then click the bookmark again.');
    return;
  }

  const resp = await fetch(menuReq.name);
  const data = await resp.json();

  const cards = (data && data.data && data.data.cards) || [];
  const items = [];

  cards.forEach(c => {
    const reg = c.groupedCard &&
                c.groupedCard.cardGroupMap &&
                c.groupedCard.cardGroupMap.REGULAR &&
                c.groupedCard.cardGroupMap.REGULAR.cards;
    if (!reg) return;

    reg.forEach(g => {
      const itemCards = g.card && g.card.card && g.card.card.itemCards;
      if (!itemCards) return;

      itemCards.forEach(v => {
        const info = v.card && v.card.info;
        if (!info) return;

        items.push({
          name: info.name,
          price: info.price ? info.price / 100 : '',
          category: info.category || '',
          desc: info.description || '',
          veg: info.isVeg ? 'Veg' : 'Non-Veg'
        });
      });
    });
  });

  if (!items.length) {
    alert('No items found. Scroll the menu fully and try again.');
    return;
  }

  // --- Build CSV ---
  let csv = 'Name,Price,Category,Description,Veg\\n';
  items.forEach(i => {
    const safeDesc = (i.desc || '').replace(/"/g, "'");
    csv += '"' + i.name + '",' + i.price + ',"' + i.category + '","' + safeDesc + '",' + i.veg + '\\n';
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'swiggy_menu.csv';
  a.click();

  // --- Create overlay to DISPLAY menu on the Swiggy page ---
  const existing = document.getElementById('swiggy-menu-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'swiggy-menu-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '10%';
  overlay.style.right = '10px';
  overlay.style.bottom = '10px';
  overlay.style.width = '320px';
  overlay.style.zIndex = '999999';
  overlay.style.background = '#ffffff';
  overlay.style.border = '1px solid #d1d5db';
  overlay.style.borderRadius = '10px';
  overlay.style.boxShadow = '0 10px 30px rgba(15,23,42,0.4)';
  overlay.style.padding = '10px';
  overlay.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  overlay.style.fontSize = '12px';
  overlay.style.overflow = 'auto';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';

  const title = document.createElement('div');
  title.textContent = 'Swiggy Menu (' + items.length + ')';
  title.style.fontWeight = '700';
  title.style.fontSize = '13px';

  const close = document.createElement('button');
  close.textContent = '×';
  close.style.border = 'none';
  close.style.background = 'transparent';
  close.style.fontSize = '18px';
  close.style.cursor = 'pointer';
  close.onclick = () => overlay.remove();

  header.appendChild(title);
  header.appendChild(close);

  const list = document.createElement('div');
  list.style.marginTop = '8px';

  items.forEach(i => {
    const row = document.createElement('div');
    row.style.marginBottom = '6px';
    row.style.borderBottom = '1px solid #f3f4f6';
    row.style.paddingBottom = '4px';

    row.innerHTML =
      '<b>' + i.name + '</b> - ₹' + i.price +
      '<br><small>' + i.category + '</small>';

    list.appendChild(row);
  });

  overlay.appendChild(header);
  overlay.appendChild(list);
  document.body.appendChild(overlay);

  alert('Extracted ' + items.length + ' items. CSV downloaded and menu overlay opened.');
})();`;

// set the href dynamically
bookmarkletLink.href = bookmarkletCode;

// prevent clicking on the page itself (user should drag it)
bookmarkletLink.addEventListener("click", function (e) {
  e.preventDefault();
  alert(
    "To use this tool:\n\n1. Drag this button to your bookmarks bar.\n2. Open any Swiggy restaurant page.\n3. Reload the page once.\n4. Click the bookmark there."
  );
});
