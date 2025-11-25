const db = require('../config/db');

async function ensureContactTable() {
  try {
    console.log('Ensuring contact_submissions table exists...');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS contact_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        status ENUM('new', 'reviewed') DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
      ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log('✅ contact_submissions table is ready.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to create contact_submissions table:', error);
    process.exit(1);
  }
}

ensureContactTable();


