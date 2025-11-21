const db = require('../config/db');

async function insertSampleNews() {
    try {
        console.log('Inserting sample news entries...');
        
        const sampleNews = [
            {
                TYPE: 'Business',
                CONTENT_NAME: 'GST Council Meeting: New Tax Rates Announced',
                CONTENT_URL: 'https://example.com/news/gst-council-meeting'
            },
            {
                TYPE: 'National',
                CONTENT_NAME: 'Income Tax Department Extends Filing Deadline',
                CONTENT_URL: 'https://example.com/news/income-tax-deadline-extension'
            },
            {
                TYPE: 'International',
                CONTENT_NAME: 'Global Tax Reforms: Impact on Indian Businesses',
                CONTENT_URL: 'https://example.com/news/global-tax-reforms'
            },
            {
                TYPE: 'Business',
                CONTENT_NAME: 'New Accounting Standards Effective from April 2024',
                CONTENT_URL: 'https://example.com/news/accounting-standards-2024'
            },
            {
                TYPE: 'National',
                CONTENT_NAME: 'Budget 2024: Key Highlights for Small Businesses',
                CONTENT_URL: 'https://example.com/news/budget-2024-highlights'
            }
        ];

        // Check if news already exists
        const [existing] = await db.execute('SELECT COUNT(*) as count FROM news');
        const existingCount = existing[0].count;

        if (existingCount > 0) {
            console.log(`Found ${existingCount} existing news entries.`);
            console.log('Skipping insertion to avoid duplicates.');
            console.log('If you want to insert sample data, please clear the news table first.');
            process.exit(0);
        }

        // Insert sample news
        for (const news of sampleNews) {
            await db.execute(
                'INSERT INTO news (TYPE, CONTENT_NAME, CONTENT_URL) VALUES (?, ?, ?)',
                [news.TYPE, news.CONTENT_NAME, news.CONTENT_URL]
            );
            console.log(`✓ Inserted: ${news.CONTENT_NAME}`);
        }

        console.log('\n✅ Successfully inserted 5 sample news entries!');
        process.exit(0);
    } catch (error) {
        console.error('Error inserting sample news:', error);
        process.exit(1);
    }
}

insertSampleNews();

