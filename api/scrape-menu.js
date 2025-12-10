export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { restaurantId } = req.query;

    if (!restaurantId) {
        return res.status(400).json({ error: 'Restaurant ID is required' });
    }

    try {
        // Swiggy API endpoint with proper coordinates
        const lat = '12.9715987';
        const lng = '77.5945627';
        const apiUrl = `https://www.swiggy.com/dapi/menu/pl?page-type=REGULAR_MENU&complete-menu=true&lat=${lat}&lng=${lng}&restaurantId=${restaurantId}`;

        console.log('Fetching from:', apiUrl);

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Referer': 'https://www.swiggy.com/',
                'Origin': 'https://www.swiggy.com',
                'Connection': 'keep-alive',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin'
            }
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            throw new Error(`Swiggy API returned status ${response.status}`);
        }

        const data = await response.json();
        console.log('Data received, parsing...');

        // Extract restaurant info with better error handling
        let restaurantInfo = null;
        const cards = data?.data?.cards || [];
        
        for (const card of cards) {
            if (card?.card?.card?.info) {
                restaurantInfo = card.card.card.info;
                break;
            }
        }

        if (!restaurantInfo) {
            console.error('Restaurant info not found in response');
            throw new Error('Restaurant not found. Please check the URL and try again.');
        }

        // Extract menu items with improved parsing
        const menuCards = data?.data?.cards?.find(card => 
            card?.groupedCard?.cardGroupMap?.REGULAR
        )?.groupedCard?.cardGroupMap?.REGULAR?.cards || [];

        const menuItems = [];

        menuCards.forEach(card => {
            try {
                // Handle regular item cards
                if (card?.card?.card?.itemCards) {
                    const category = card.card.card.title || 'Others';
                    card.card.card.itemCards.forEach(itemCard => {
                        const item = itemCard?.card?.info;
                        if (item) {
                            menuItems.push({
                                category: category,
                                name: item.name || 'Unnamed Item',
                                price: item.price ? (item.price / 100).toFixed(2) : 
                                       item.defaultPrice ? (item.defaultPrice / 100).toFixed(2) : 'N/A',
                                description: item.description || '',
                                isVeg: item.isVeg === 1 || item.itemAttribute?.vegClassifier === 'VEG'
                            });
                        }
                    });
                }
                
                // Handle nested categories
                if (card?.card?.card?.categories) {
                    const mainCategory = card.card.card.title || 'Others';
                    card.card.card.categories.forEach(subCategory => {
                        const category = subCategory.title || mainCategory;
                        subCategory.itemCards?.forEach(itemCard => {
                            const item = itemCard?.card?.info;
                            if (item) {
                                menuItems.push({
                                    category: category,
                                    name: item.name || 'Unnamed Item',
                                    price: item.price ? (item.price / 100).toFixed(2) : 
                                           item.defaultPrice ? (item.defaultPrice / 100).toFixed(2) : 'N/A',
                                    description: item.description || '',
                                    isVeg: item.isVeg === 1 || item.itemAttribute?.vegClassifier === 'VEG'
                                });
                            }
                        });
                    });
                }
            } catch (err) {
                console.error('Error parsing menu card:', err);
                // Continue with other cards
            }
        });

        console.log(`Successfully parsed ${menuItems.length} menu items`);

        if (menuItems.length === 0) {
            throw new Error('No menu items found for this restaurant');
        }

        return res.status(200).json({
            restaurantName: restaurantInfo.name || 'Unknown Restaurant',
            cuisine: restaurantInfo.cuisines?.join(', ') || 'N/A',
            area: restaurantInfo.areaName || restaurantInfo.locality || 'N/A',
            city: restaurantInfo.city || 'N/A',
            rating: restaurantInfo.avgRating || 'N/A',
            menu: menuItems
        });

    } catch (error) {
        console.error('Error in handler:', error);
        return res.status(500).json({ 
            error: error.message || 'Failed to scrape menu data. Please try again or check if the restaurant URL is correct.'
        });
    }
}

export const config = {
    api: {
        bodyParser: false,
        externalResolver: true,
    },
};
