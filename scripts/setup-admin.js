const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function setupAdmin() {
    try {
        console.log('Setting up admin user...');
        
        // Check if admin already exists
        const [existing] = await db.execute(
            'SELECT * FROM admin WHERE USER_NAME = ?',
            ['admin']
        );

        if (existing.length > 0) {
            // Update existing admin password
            await db.execute(
                'UPDATE admin SET PASSWORD = ? WHERE USER_NAME = ?',
                ['123456', 'admin']
            );
            console.log('Admin user password updated successfully!');
            console.log('Username: admin');
            console.log('Password: 123456');
        } else {
            // Insert new admin user
            await db.execute(
                'INSERT INTO admin (USER_NAME, PASSWORD) VALUES (?, ?)',
                ['admin', '123456']
            );
            console.log('Admin user created successfully!');
            console.log('Username: admin');
            console.log('Password: 123456');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error setting up admin:', error);
        process.exit(1);
    }
}

setupAdmin();

