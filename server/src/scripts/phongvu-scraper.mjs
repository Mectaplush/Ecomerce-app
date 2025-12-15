import axios from "axios";
import fs from "fs";

const API_URL = "https://discovery.tekoapis.com/api/v2/search-skus-v2";

function convertToCSV(products) {
    if (!products.length) return '';

    // CSV headers
    const headers = ['name', 'price', 'description', 'images', 'stock', 'categoryId', 'componentType'];

    // Escape CSV values
    const escapeCSV = (value) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    // Create CSV content
    const csvRows = [
        headers.join(','),
        ...products.map(product =>
            headers.map(header => escapeCSV(product[header])).join(',')
        )
    ];

    return csvRows.join('\n');
}

async function fetchPage({ slug, page }) {
    const res = await axios.post(
        API_URL,
        {
            terminalId: 4,
            page,
            pageSize: 40,
            slug,
            filter: {},
            sorting: {
                sort: "SORT_BY_CREATED_AT",
                order: "ORDER_BY_DESCENDING"
            },
            isNeedFeaturedProducts: false
        },
        {
            headers: {
                "Content-Type": "application/json",
                "Origin": "https://phongvu.vn",
                "Referer": "https://phongvu.vn",
                "User-Agent": "Mozilla/5.0"
            }
        }
    );

    return res.data;
}

async function scrapeCategory(slug, categoryId, componentType = "pc") {
    let page = 1;
    let allProducts = [];
    let totalPages = 1;

    do {
        console.log(`Scraping page ${page}...`);

        const data = await fetchPage({ slug, page });

        // console.log("Fetched: ", data);

        const products = data?.data?.products || [];
        const pagination = data?.data?.pagination;

        allProducts.push(
            ...products.map(p => ({
                id: p.sku,
                name: p.name || "Name Not Found",
                price: p.latestPrice || 999999999,
                description: p.shortDescription || "Description Not Found",
                //finalPrice: p.finalPrice,
                //brand: p.brand?.name,
                images: p.imageUrl || "",
                stock: p.totalAvailable || 0,
                categoryId: categoryId,
                componentType: componentType,
                //url: `https://phongvu.vn/${p.slug}`
            }))
        );

        totalPages = pagination?.totalPages || page;
        page++;

        // rate limit
        await new Promise(r => setTimeout(r, 800));

    } while (page <= totalPages);

    return allProducts;
}

const runScraper = async (category, categoryId, componentType = "pc") => {
    const slug = `/c/${category}`; // ✅ category you want
    const products = await scrapeCategory(slug, categoryId, componentType);

    // Convert to CSV and save
    const csvContent = convertToCSV(products);
    fs.writeFileSync(
        `phongvu-${category}.csv`,
        csvContent
    );

    console.log(`✅ Saved ${products.length} products to CSV`);
};


let tasks = [{
    category: "pc-gaming",
    categoryId: "6b901f09-75b8-454f-999a-e6dab4907d88",
    componentType: "pc"
},
{
    category: "pc-ai-may-tinh-ai-tri-tue-nhan-tao",
    categoryId: "6e725c98-b953-4f7d-bfc4-f5a68fe721db",
    componentType: "pc"
},
// {
//     category: "linh-kien-may-tinh",
//     categoryId: "751258d9-4091-4ce5-9b7e-ffb7a8513f34",
//     componentType: "?"
// },
{
    category: "pc-do-hoa",
    categoryId: "79f702e8-389b-4ba4-9aec-1ee5f9eaa21a",
    componentType: "pc"
},
{
    category: "pc-van-phong",
    categoryId: "c0dfc09e-a202-4884-b29b-6cbaf38c5fe1",
    componentType: "pc"
}, {
    category: "may-tinh-de-ban-mini",
    categoryId: "d46001af-0595-472e-83d4-e437b3b565ba",
    componentType: "pc"
},
].map(({ category, categoryId, componentType }) =>
    runScraper(category, categoryId, componentType).catch(err => console.error(`Error scraping ${category}:`, err))
);

await Promise.all(tasks);
