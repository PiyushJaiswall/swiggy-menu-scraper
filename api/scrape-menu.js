export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    const { restaurantId } = req.query;

    if (!restaurantId) {
        return res.status(400).json({ error: 'Restaurant ID is required' });
    }

    try {
        // Swiggy API endpoint
        const apiUrl = `https://www.swiggy.com/dapi/menu/pl?page-type=REGULAR_MENU&complete-menu=true&lat=12.9715987&lng=77.5945627&restaurantId=${restaurantId}`;

        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch data from Swiggy');
        }

        const data = await response.json();

        // Extract restaurant info
        const restaurantInfo = data.data?.cards?.find(card => card.card?.card?.info)?.card?.card?.info;
        
        if (!restaurantInfo) {
            throw new Error('Restaurant not found');
        }

        // Extract menu items
        const menuCards = data.data?.cards?.find(card => 
            card.groupedCard?.cardGroupMap?.REGULAR
        )?.groupedCard?.cardGroupMap?.REGULAR?.cards || [];

        const menuItems = [];

        menuCards.forEach(card => {
            if (card.card?.card?.itemCards) {
                const category = card.card.card.title || 'Others';
                card.card.card.itemCards.forEach(itemCard => {
                    const item = itemCard.card.info;
                    menuItems.push({
                        category: category,
                        name: item.name,
                        price: item.price ? (item.price / 100).toFixed(2) : 'N/A',
                        description: item.description || '',
                        isVeg: item.isVeg === 1
                    });
                });
            } else if (card.card?.card?.categories) {
                const mainCategory = card.card.card.title || 'Others';
                card.card.card.categories.forEach(subCategory => {
                    const category = subCategory.title || mainCategory;
                    subCategory.itemCards?.forEach(itemCard => {
                        const item = itemCard.card.info;
                        menuItems.push({
                            category: category,
                            name: item.name,
                            price: item.price ? (item.price / 100).toFixed(2) : 'N/A',
                            description: item.description || '',
                            isVeg: item.isVeg === 1
                        });
                    });
                });
            }
        });

        return res.status(200).json({
            restaurantName: restaurantInfo.name,
            cuisine: restaurantInfo.cuisines?.join(', '),
            area: restaurantInfo.areaName,
            menu: menuItems
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ 
            error: error.message || 'Failed to scrape menu data'
        });
    }
}
