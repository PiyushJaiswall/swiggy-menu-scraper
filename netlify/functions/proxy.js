const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { restaurantId } = event.queryStringParameters;

    if (!restaurantId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Restaurant ID required' })
      };
    }

    const apiUrl = `https://www.swiggy.com/dapi/menu/pl?page-type=REGULAR_MENU&complete-menu=true&lat=12.9715987&lng=77.5945627&restaurantId=${restaurantId}`;

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    const data = await response.json();

    // Extract restaurant info
    let restaurantInfo = null;
    const cards = data?.data?.cards || [];
    
    for (const card of cards) {
      if (card?.card?.card?.info) {
        restaurantInfo = card.card.card.info;
        break;
      }
    }

    if (!restaurantInfo) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Restaurant not found' })
      };
    }

    // Extract menu
    const menuCards = data?.data?.cards?.find(card => 
      card?.groupedCard?.cardGroupMap?.REGULAR
    )?.groupedCard?.cardGroupMap?.REGULAR?.cards || [];

    const menuItems = [];

    menuCards.forEach(card => {
      try {
        if (card?.card?.card?.itemCards) {
          const category = card.card.card.title || 'Others';
          card.card.card.itemCards.forEach(itemCard => {
            const item = itemCard?.card?.info;
            if (item?.name) {
              menuItems.push({
                category,
                name: item.name,
                price: item.price ? (item.price / 100).toFixed(2) : 
                       item.defaultPrice ? (item.defaultPrice / 100).toFixed(2) : 'N/A',
                description: item.description || '',
                isVeg: item.isVeg === 1
              });
            }
          });
        }
        
        if (card?.card?.card?.categories) {
          const mainCategory = card.card.card.title || 'Others';
          card.card.card.categories.forEach(subCategory => {
            const category = subCategory.title || mainCategory;
            subCategory.itemCards?.forEach(itemCard => {
              const item = itemCard?.card?.info;
              if (item?.name) {
                menuItems.push({
                  category,
                  name: item.name,
                  price: item.price ? (item.price / 100).toFixed(2) : 
                         item.defaultPrice ? (item.defaultPrice / 100).toFixed(2) : 'N/A',
                  description: item.description || '',
                  isVeg: item.isVeg === 1
                });
              }
            });
          });
        }
      } catch (err) {
        // Continue
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        name: restaurantInfo.name,
        cuisine: restaurantInfo.cuisines?.join(', ') || 'N/A',
        area: restaurantInfo.areaName || 'N/A',
        rating: restaurantInfo.avgRating || 'N/A',
        menu: menuItems
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
