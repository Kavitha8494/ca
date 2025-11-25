const db = require('../config/db');

async function ensureContactTable() {
  try {
    console.log('Ensuring contact_submissions table exists...');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS contact_submissions (
        ID INT AUTO_INCREMENT PRIMARY KEY,
        FULL_NAME VARCHAR(100) NOT NULL,
        EMAIL VARCHAR(150) NOT NULL,
        PHONE VARCHAR(20) NOT NULL,
        MESSAGE TEXT NOT NULL,
        STATUS ENUM('NEW', 'REVIEWED') DEFAULT 'NEW',
        CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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


