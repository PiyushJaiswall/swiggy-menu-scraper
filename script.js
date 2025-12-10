let extractedMenu = [];

// OPEN RESTAURANT PAGE
document.getElementById("openBtn").onclick = () => {
    const url = document.getElementById("urlInput").value.trim();
    if (!url.includes("swiggy.com")) {
        alert("Please enter a valid Swiggy URL");
        return;
    }
    window.open(url, "_blank");
};

// EXTRACT MENU FROM NETWORK HISTORY
document.getElementById("extractBtn").onclick = async () => {
    extractedMenu = [];

    const entries = performance.getEntriesByType("resource");
    const menuReq = entries.find(e => e.name.includes("dapi/menu/pl"));

    if (!menuReq) {
        alert("Menu request not found! Reload the restaurant page and try again.");
        return;
    }

    const response = await fetch(menuReq.name);
    const data = await response.json();

    const cards = data?.data?.cards ?? [];

    for (const c of cards) {
        const reg = c.groupedCard?.cardGroupMap?.REGULAR?.cards;
        if (!reg) continue;

        for (const itemGrp of reg) {
            const items = itemGrp.card?.card?.itemCards;
            if (!items) continue;

            for (const it of items) {
                const info = it.card?.info;

                extractedMenu.push({
                    name: info?.name,
                    price: info?.price ? info.price / 100 : "",
                    category: info?.category || "",
                    veg: info?.isVeg ? "Veg" : "Non-Veg",
                    description: info?.description || ""
                });
            }
        }
    }

    displayMenu();
};

// SHOW MENU ON WEBPAGE
function displayMenu() {
    const container = document.getElementById("menuContainer");
    container.innerHTML = "";

    if (extractedMenu.length === 0) {
        container.innerHTML = "<p>No menu data found.</p>";
        return;
    }

    extractedMenu.forEach(item => {
        const div = document.createElement("div");
        div.innerHTML = `<b>${item.name}</b> - ₹${item.price} <br> ${item.category}`;
        container.appendChild(div);
    });
}

// DOWNLOAD CSV
document.getElementById("downloadBtn").onclick = () => {
    if (extractedMenu.length === 0) {
        alert("Extract menu first!");
        return;
    }

    let csv = "Name,Price,Category,Description,Veg\n";

    extractedMenu.forEach(i => {
        csv += `"${i.name}",${i.price},"${i.category}","${i.description.replace(/"/g, "'")}",${i.veg}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "swiggy_menu.csv";
    a.click();
};
