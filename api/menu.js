export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // Handle CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const lat = searchParams.get('lat') || '12.9715987';
    const lng = searchParams.get('lng') || '77.5945627';

    if (!restaurantId) {
      return new Response(
        JSON.stringify({ error: 'Restaurant ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiUrl = `https://www.swiggy.com/dapi/menu/pl?page-type=REGULAR_MENU&complete-menu=true&lat=${lat}&lng=${lng}&restaurantId=${restaurantId}`;

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.swiggy.com/',
        'Origin': 'https://www.swiggy.com'
      }
    });

    if (!response.ok) {
      throw new Error(`Swiggy API returned ${response.status}`);
    }

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
      return new Response(
        JSON.stringify({ error: 'Restaurant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract menu items
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
            if (item && item.name) {
              menuItems.push({
                category: category,
                name: item.name,
                price: item.price ? (item.price / 100).toFixed(2) : 
                       item.defaultPrice ? (item.defaultPrice / 100).toFixed(2) : 
                       item.finalPrice ? (item.finalPrice / 100).toFixed(2) : 'N/A',
                description: item.description || '',
                isVeg: item.isVeg === 1 || item.itemAttribute?.vegClassifier === 'VEG'
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
              if (item && item.name) {
                menuItems.push({
                  category: category,
                  name: item.name,
                  price: item.price ? (item.price / 100).toFixed(2) : 
                         item.defaultPrice ? (item.defaultPrice / 100).toFixed(2) : 
                         item.finalPrice ? (item.finalPrice / 100).toFixed(2) : 'N/A',
                  description: item.description || '',
                  isVeg: item.isVeg === 1 || item.itemAttribute?.vegClassifier === 'VEG'
                });
              }
            });
          });
        }
      } catch (err) {
        // Continue processing
      }
    });

    const result = {
      restaurantName: restaurantInfo.name || 'Unknown',
      cuisine: restaurantInfo.cuisines?.join(', ') || 'N/A',
      area: restaurantInfo.areaName || restaurantInfo.locality || 'N/A',
      city: restaurantInfo.city || 'N/A',
      rating: restaurantInfo.avgRating || 'N/A',
      costForTwo: restaurantInfo.costForTwoMessage || 'N/A',
      menu: menuItems
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch menu' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
