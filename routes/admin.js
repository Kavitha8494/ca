const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const he = require('he');

// Admin Login Page
router.get('/login', (req, res) => {
    // If already logged in, redirect to news page
    if (req.session.adminLoggedIn) {
        return res.redirect('/admin/news');
    }
    res.render('admin/login', { error: null, success: null });
});

router.get('/', (req, res) => {
        return res.redirect('/admin/login');
});

// Admin Login API
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.render('admin/login', { 
                error: 'Username and password are required',
                success: null 
            });
        }

        // Query admin from database
        const [admins] = await db.execute(
            'SELECT * FROM admin WHERE USER_NAME = ?',
            [username]
        );

        if (admins.length === 0) {
            return res.render('admin/login', { 
                error: 'Invalid username or password',
                success: null 
            });
        }

        const admin = admins[0];

        // Validate password
        // Check if password is hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
        const isHashed = admin.PASSWORD.startsWith('$2a$') || 
                        admin.PASSWORD.startsWith('$2b$') || 
                        admin.PASSWORD.startsWith('$2y$');
        
        let isPasswordValid = false;
        
        if (isHashed) {
            // Password is hashed, use bcrypt comparison
            try {
                isPasswordValid = await bcrypt.compare(password, admin.PASSWORD);
            } catch (err) {
                console.error('Bcrypt comparison error:', err);
                isPasswordValid = false;
            }
        } else {
            // Password is plain text, do direct comparison
            isPasswordValid = (admin.PASSWORD === password);
        }

        if (!isPasswordValid) {
            return res.render('admin/login', { 
                error: 'Invalid username or password',
                success: null 
            });
        }

        // Set session
        req.session.adminLoggedIn = true;
        req.session.adminId = admin.ID;
        req.session.adminUsername = admin.USER_NAME;

        // Redirect to news page
        res.redirect('/admin/news');
    } catch (error) {
        console.error('Login error:', error);
        res.render('admin/login', { 
            error: 'An error occurred during login. Please try again.',
            success: null 
        });
    }
});

// Middleware to check if admin is logged in
const requireAuth = (req, res, next) => {
    if (req.session.adminLoggedIn) {
        next();
    } else {
        res.redirect('/admin/login');
    }
};

// Admin Logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/admin/login');
    });
});

// News Management Page with Pagination
router.get('/news', requireAuth, async (req, res) => {
    try {
        const searchQuery = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 5; // 5 items per page
        const offset = (page - 1) * limit;
        
        let news, totalCount;
        let whereClause = '';
        let queryParams = [];
        
        if (searchQuery) {
            whereClause = 'WHERE CONTENT_NAME LIKE ? OR CONTENT_URL LIKE ? OR TYPE LIKE ?';
            queryParams = [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`];
        }
        
        // Get total count for pagination
        let countResult;
        if (searchQuery) {
            [countResult] = await db.execute(
                `SELECT COUNT(*) as total FROM news ${whereClause}`,
                queryParams
            );
        } else {
            [countResult] = await db.execute('SELECT COUNT(*) as total FROM news');
        }
        
        totalCount = countResult[0].total;
        const totalPages = Math.ceil(totalCount / limit);
        
        // Get paginated news
        if (searchQuery) {
            queryParams.push(limit, offset);
            [news] = await db.execute(
                `SELECT * FROM news ${whereClause} ORDER BY TIMESTAMP DESC LIMIT ? OFFSET ?`,
                queryParams
            );
        } else {
            [news] = await db.execute(
                'SELECT * FROM news ORDER BY TIMESTAMP DESC LIMIT ? OFFSET ?',
                [limit, offset]
            );
        }

        res.render('admin/news', { 
            news: news || [],
            searchQuery: searchQuery,
            adminUsername: req.session.adminUsername,
            currentPage: page,
            totalPages: totalPages,
            totalCount: totalCount,
            limit: limit
        });
    } catch (error) {
        console.error('Error fetching news:', error);
        res.render('admin/news', { 
            news: [],
            searchQuery: '',
            adminUsername: req.session.adminUsername,
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            limit: 5,
            error: 'Error loading news data'
        });
    }
});

// Add News Page
router.get('/news/add', requireAuth, (req, res) => {
    res.render('admin/add-news', {
        adminUsername: req.session.adminUsername
    });
});

// Add News API
router.post('/news/add', requireAuth, async (req, res) => {
    try {
        const { type, contentName, contentUrl } = req.body;

        // Validation
        if (!type || !contentName || !contentUrl) {
            return res.render('admin/add-news', {
                adminUsername: req.session.adminUsername,
                error: 'All fields are required',
                formData: req.body
            });
        }

        // Validate type
        const validTypes = ['Business', 'National', 'International'];
        if (!validTypes.includes(type)) {
            return res.render('admin/add-news', {
                adminUsername: req.session.adminUsername,
                error: 'Invalid type selected',
                formData: req.body
            });
        }

        // Validate URL format
        try {
            new URL(contentUrl);
        } catch (e) {
            return res.render('admin/add-news', {
                adminUsername: req.session.adminUsername,
                error: 'Please enter a valid URL',
                formData: req.body
            });
        }

        // Validate content name length
        if (contentName.trim().length < 3) {
            return res.render('admin/add-news', {
                adminUsername: req.session.adminUsername,
                error: 'Content name must be at least 3 characters',
                formData: req.body
            });
        }

        // Insert news into database
        await db.execute(
            'INSERT INTO news (TYPE, CONTENT_NAME, CONTENT_URL) VALUES (?, ?, ?)',
            [type, contentName.trim(), contentUrl.trim()]
        );

        // Redirect to news page with success message
        res.redirect('/admin/news?success=News added successfully');
    } catch (error) {
        console.error('Error adding news:', error);
        res.render('admin/add-news', {
            adminUsername: req.session.adminUsername,
            error: 'An error occurred while adding news. Please try again.',
            formData: req.body
        });
    }
});

// Edit News Page
router.get('/news/edit/:id', requireAuth, async (req, res) => {
    try {
        const newsId = req.params.id;

        if (!newsId) {
            return res.redirect('/admin/news?error=Invalid news ID');
        }

        // Get news from database
        const [news] = await db.execute('SELECT * FROM news WHERE ID = ?', [newsId]);

        if (news.length === 0) {
            return res.redirect('/admin/news?error=News not found');
        }

        res.render('admin/edit-news', {
            adminUsername: req.session.adminUsername,
            news: news[0]
        });
    } catch (error) {
        console.error('Error fetching news for edit:', error);
        res.redirect('/admin/news?error=Error loading news data');
    }
});

// Update News API
router.post('/news/edit/:id', requireAuth, async (req, res) => {
    try {
        const newsId = req.params.id;
        const { type, contentName, contentUrl } = req.body;

        if (!newsId) {
            return res.redirect('/admin/news?error=Invalid news ID');
        }

        // Validation
        if (!type || !contentName || !contentUrl) {
            // Get news data to repopulate form
            const [news] = await db.execute('SELECT * FROM news WHERE ID = ?', [newsId]);
            return res.render('admin/edit-news', {
                adminUsername: req.session.adminUsername,
                news: news[0],
                error: 'All fields are required'
            });
        }

        // Validate type
        const validTypes = ['Business', 'National', 'International'];
        if (!validTypes.includes(type)) {
            const [news] = await db.execute('SELECT * FROM news WHERE ID = ?', [newsId]);
            return res.render('admin/edit-news', {
                adminUsername: req.session.adminUsername,
                news: news[0],
                error: 'Invalid type selected'
            });
        }

        // Validate URL format
        try {
            new URL(contentUrl);
        } catch (e) {
            const [news] = await db.execute('SELECT * FROM news WHERE ID = ?', [newsId]);
            return res.render('admin/edit-news', {
                adminUsername: req.session.adminUsername,
                news: news[0],
                error: 'Please enter a valid URL'
            });
        }

        // Validate content name length
        if (contentName.trim().length < 3) {
            const [news] = await db.execute('SELECT * FROM news WHERE ID = ?', [newsId]);
            return res.render('admin/edit-news', {
                adminUsername: req.session.adminUsername,
                news: news[0],
                error: 'Content name must be at least 3 characters'
            });
        }

        // Check if news exists
        const [existingNews] = await db.execute('SELECT * FROM news WHERE ID = ?', [newsId]);
        if (existingNews.length === 0) {
            return res.redirect('/admin/news?error=News not found');
        }

        // Update news in database
        await db.execute(
            'UPDATE news SET TYPE = ?, CONTENT_NAME = ?, CONTENT_URL = ? WHERE ID = ?',
            [type, contentName.trim(), contentUrl.trim(), newsId]
        );

        // Redirect to news page with success message
        res.redirect('/admin/news?success=News updated successfully');
    } catch (error) {
        console.error('Error updating news:', error);
        res.redirect('/admin/news?error=An error occurred while updating news');
    }
});

// Delete News API
router.delete('/news/:id', requireAuth, async (req, res) => {
    try {
        const newsId = req.params.id;
        
        if (!newsId) {
            return res.status(400).json({ success: false, message: 'News ID is required' });
        }
        
        // Check if news exists
        const [news] = await db.execute('SELECT * FROM news WHERE ID = ?', [newsId]);
        
        if (news.length === 0) {
            return res.status(404).json({ success: false, message: 'News not found' });
        }
        
        // Delete news
        await db.execute('DELETE FROM news WHERE ID = ?', [newsId]);
        
        res.json({ success: true, message: 'News deleted successfully' });
    } catch (error) {
        console.error('Error deleting news:', error);
        res.status(500).json({ success: false, message: 'Error deleting news' });
    }
});

// Blog Management Page with Pagination, Search, and Date Filter
router.get('/blog', requireAuth, async (req, res) => {
    try {
        const searchQuery = req.query.search || '';
        const dateFrom = req.query.dateFrom || '';
        const dateTo = req.query.dateTo || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 5; // 5 items per page
        const offset = (page - 1) * limit;
        
        let blogs, totalCount;
        let whereConditions = [];
        let queryParams = [];
        
        // Build WHERE clause
        if (searchQuery) {
            whereConditions.push('(CONTENT LIKE ? OR LINK_URL LIKE ?)');
            queryParams.push(`%${searchQuery}%`, `%${searchQuery}%`);
        }
        
        if (dateFrom) {
            whereConditions.push('DATE >= ?');
            queryParams.push(dateFrom);
        }
        
        if (dateTo) {
            whereConditions.push('DATE <= ?');
            queryParams.push(dateTo);
        }
        
        const whereClause = whereConditions.length > 0 
            ? 'WHERE ' + whereConditions.join(' AND ')
            : '';
        
        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM news_due_date_blog';
        if (whereClause) {
            countQuery += ' ' + whereClause;
        }
        
        const [countResult] = await db.execute(countQuery, queryParams);
        totalCount = countResult[0].total;
        const totalPages = Math.ceil(totalCount / limit);
        
        // Get paginated blogs
        let blogQuery = 'SELECT * FROM news_due_date_blog';
        if (whereClause) {
            blogQuery += ' ' + whereClause;
        }
        blogQuery += ' ORDER BY TIMESTAMP DESC LIMIT ? OFFSET ?';
        
        queryParams.push(limit, offset);
        [blogs] = await db.execute(blogQuery, queryParams);

        // Decode HTML entities in blog content
        const decodedBlogs = (blogs || []).map(blog => ({
            ...blog,
            CONTENT: he.decode(blog.CONTENT || '')
        }));

        res.render('admin/blog', { 
            blogs: decodedBlogs,
            searchQuery: searchQuery,
            dateFrom: dateFrom,
            dateTo: dateTo,
            adminUsername: req.session.adminUsername,
            currentPage: page,
            totalPages: totalPages,
            totalCount: totalCount,
            limit: limit
        });
    } catch (error) {
        console.error('Error fetching blogs:', error);
        res.render('admin/blog', { 
            blogs: [],
            searchQuery: '',
            dateFrom: '',
            dateTo: '',
            adminUsername: req.session.adminUsername,
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            limit: 5,
            error: 'Error loading blog data'
        });
    }
});

// Add Blog Page
router.get('/blog/add', requireAuth, (req, res) => {
    res.render('admin/add-blog', {
        adminUsername: req.session.adminUsername
    });
});

// Add Blog API
router.post('/blog/add', requireAuth, async (req, res) => {
    try {
        const { type, content, linkUrl, date } = req.body;

        // Validation
        if (!type || !content || !date) {
            return res.render('admin/add-blog', {
                adminUsername: req.session.adminUsername,
                error: 'Type, Content, and Date are required',
                formData: req.body
            });
        }

        // Validate type
        const validTypes = ['NEWS', 'DUE_DATE_REMAINDER', 'BLOGS'];
        if (!validTypes.includes(type)) {
            return res.render('admin/add-blog', {
                adminUsername: req.session.adminUsername,
                error: 'Invalid type selected',
                formData: req.body
            });
        }

        // Validate content (strip HTML tags for length check)
        const contentText = content.replace(/<[^>]*>/g, '').trim();
        if (contentText.length < 10) {
            return res.render('admin/add-blog', {
                adminUsername: req.session.adminUsername,
                error: 'Content must be at least 10 characters',
                formData: req.body
            });
        }

        // Validate date format
        if (!date || isNaN(new Date(date).getTime())) {
            return res.render('admin/add-blog', {
                adminUsername: req.session.adminUsername,
                error: 'Please enter a valid date',
                formData: req.body
            });
        }

        // LINK_URL is optional, validate only if provided
        let finalLinkUrl = '';
        if (linkUrl && linkUrl.trim()) {
            try {
                new URL(linkUrl.trim());
                finalLinkUrl = linkUrl.trim();
            } catch (e) {
                return res.render('admin/add-blog', {
                    adminUsername: req.session.adminUsername,
                    error: 'Please enter a valid URL or leave it empty',
                    formData: req.body
                });
            }
        }

        // Insert blog into database
        await db.execute(
            'INSERT INTO news_due_date_blog (TYPE, CONTENT, LINK_URL, DATE) VALUES (?, ?, ?, ?)',
            [type, content.trim(), finalLinkUrl, date]
        );

        // Redirect to blog page with success message
        res.redirect('/admin/blog?success=Blog created successfully');
    } catch (error) {
        console.error('Error adding blog:', error);
        res.render('admin/add-blog', {
            adminUsername: req.session.adminUsername,
            error: 'An error occurred while creating blog. Please try again.',
            formData: req.body
        });
    }
});

// Edit Blog Page - Must be before /blog/:id route
router.get('/blog/edit/:id', requireAuth, async (req, res) => {
    try {
        const blogId = req.params.id;
        console.log('Edit blog route hit with ID:', blogId);

        if (!blogId) {
            return res.redirect('/admin/blog?error=Invalid blog ID');
        }

        // Get blog from database with DATE formatted as string to avoid timezone issues
        const [blogs] = await db.execute(
            'SELECT ID, TYPE, CONTENT, LINK_URL, DATE_FORMAT(DATE, "%Y-%m-%d") as DATE, TIMESTAMP FROM news_due_date_blog WHERE ID = ?', 
            [blogId]
        );

        if (blogs.length === 0) {
            return res.redirect('/admin/blog?error=Blog not found');
        }

        // Decode HTML entities in content so editor shows formatted content, not raw tags
        const blog = blogs[0];
        const blogContentHtml = he.decode(blog.CONTENT || '');

        // Format date for input field - DATE is already formatted as YYYY-MM-DD string from SQL
        // This avoids timezone conversion issues
        const blogFormattedDate = blog.DATE || '';

        res.render('admin/edit-blog', {
            adminUsername: req.session.adminUsername,
            blog,
            blogContentHtml,
            blogFormattedDate
        });
    } catch (error) {
        console.error('Error fetching blog for edit:', error);
        res.redirect('/admin/blog?error=Error loading blog data');
    }
});

// Update Blog API
router.post('/blog/edit/:id', requireAuth, async (req, res) => {
    try {
        const blogId = req.params.id;
        const { type, content, linkUrl, date } = req.body;

        if (!blogId) {
            return res.redirect('/admin/blog?error=Invalid blog ID');
        }

        // Validation
        if (!type || !content || !date) {
            // Get blog data to repopulate form
            const [blogs] = await db.execute('SELECT * FROM news_due_date_blog WHERE ID = ?', [blogId]);
            return res.render('admin/edit-blog', {
                adminUsername: req.session.adminUsername,
                blog: blogs[0],
                error: 'Type, Content, and Date are required'
            });
        }

        // Validate type
        const validTypes = ['NEWS', 'DUE_DATE_REMAINDER', 'BLOGS'];
        if (!validTypes.includes(type)) {
            const [blogs] = await db.execute('SELECT * FROM news_due_date_blog WHERE ID = ?', [blogId]);
            return res.render('admin/edit-blog', {
                adminUsername: req.session.adminUsername,
                blog: blogs[0],
                error: 'Invalid type selected'
            });
        }

        // Validate content (strip HTML tags for length check)
        const contentText = content.replace(/<[^>]*>/g, '').trim();
        if (contentText.length < 10) {
            const [blogs] = await db.execute('SELECT * FROM news_due_date_blog WHERE ID = ?', [blogId]);
            return res.render('admin/edit-blog', {
                adminUsername: req.session.adminUsername,
                blog: blogs[0],
                error: 'Content must be at least 10 characters'
            });
        }

        // Validate date format
        if (!date || isNaN(new Date(date).getTime())) {
            const [blogs] = await db.execute('SELECT * FROM news_due_date_blog WHERE ID = ?', [blogId]);
            return res.render('admin/edit-blog', {
                adminUsername: req.session.adminUsername,
                blog: blogs[0],
                error: 'Please enter a valid date'
            });
        }

        // Check if blog exists
        const [existingBlogs] = await db.execute('SELECT * FROM news_due_date_blog WHERE ID = ?', [blogId]);
        if (existingBlogs.length === 0) {
            return res.redirect('/admin/blog?error=Blog not found');
        }

        // LINK_URL is optional, validate only if provided
        let finalLinkUrl = '';
        if (linkUrl && linkUrl.trim()) {
            try {
                new URL(linkUrl.trim());
                finalLinkUrl = linkUrl.trim();
            } catch (e) {
                const [blogs] = await db.execute('SELECT * FROM news_due_date_blog WHERE ID = ?', [blogId]);
                return res.render('admin/edit-blog', {
                    adminUsername: req.session.adminUsername,
                    blog: blogs[0],
                    error: 'Please enter a valid URL or leave it empty'
                });
            }
        }

        // Update blog in database
        await db.execute(
            'UPDATE news_due_date_blog SET TYPE = ?, CONTENT = ?, LINK_URL = ?, DATE = ? WHERE ID = ?',
            [type, content.trim(), finalLinkUrl, date, blogId]
        );

        // Redirect to blog page with success message
        res.redirect('/admin/blog?success=Blog updated successfully');
    } catch (error) {
        console.error('Error updating blog:', error);
        res.redirect('/admin/blog?error=An error occurred while updating blog');
    }
});

// Delete Blog API
router.delete('/blog/:id', requireAuth, async (req, res) => {
    try {
        const blogId = req.params.id;
        
        if (!blogId) {
            return res.status(400).json({ success: false, message: 'Blog ID is required' });
        }
        
        // Check if blog exists
        const [blogs] = await db.execute('SELECT * FROM news_due_date_blog WHERE ID = ?', [blogId]);
        
        if (blogs.length === 0) {
            return res.status(404).json({ success: false, message: 'Blog not found' });
        }
        
        // Delete blog
        await db.execute('DELETE FROM news_due_date_blog WHERE ID = ?', [blogId]);
        
        res.json({ success: true, message: 'Blog deleted successfully' });
    } catch (error) {
        console.error('Error deleting blog:', error);
        res.status(500).json({ success: false, message: 'Error deleting blog' });
    }
});

// Careers Management Page with Pagination and Search
router.get('/careers', requireAuth, async (req, res) => {
    try {
        const searchQuery = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 5; // 5 items per page
        const offset = (page - 1) * limit;

        let careers, totalCount;
        let whereClause = '';
        let queryParams = [];

        if (searchQuery) {
            whereClause = `
                WHERE 
                    FIRST_NAME LIKE ? OR 
                    LAST_NAME LIKE ? OR 
                    EMAIL LIKE ? OR 
                    MOBILE_NUMBER LIKE ? OR
                    POSITION LIKE ?
            `;
            const like = `%${searchQuery}%`;
            queryParams = [like, like, like, like, like];
        }

        // Get total count
        let countSql = 'SELECT COUNT(*) as total FROM careers';
        if (whereClause) {
            countSql += ' ' + whereClause;
        }
        const [countResult] = await db.execute(countSql, queryParams);
        totalCount = countResult[0].total;
        const totalPages = Math.ceil(totalCount / limit);

        // Get paginated careers
        let dataSql = 'SELECT * FROM careers';
        if (whereClause) {
            dataSql += ' ' + whereClause;
        }
        dataSql += ' ORDER BY ID DESC LIMIT ? OFFSET ?';
        const dataParams = [...queryParams, limit, offset];
        [careers] = await db.execute(dataSql, dataParams);

        res.render('admin/careers', {
            careers: careers || [],
            searchQuery,
            adminUsername: req.session.adminUsername,
            currentPage: page,
            totalPages,
            totalCount,
            limit
        });
    } catch (error) {
        console.error('Error fetching careers:', error);
        res.render('admin/careers', {
            careers: [],
            searchQuery: '',
            adminUsername: req.session.adminUsername,
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            limit: 5,
            error: 'Error loading careers data'
        });
    }
});

// Career Details View Page
router.get('/careers/:id', requireAuth, async (req, res) => {
    try {
        const careerId = req.params.id;
        if (!careerId) {
            return res.redirect('/admin/careers?error=Invalid career ID');
        }

        const [rows] = await db.execute('SELECT * FROM careers WHERE ID = ?', [careerId]);
        if (rows.length === 0) {
            return res.redirect('/admin/careers?error=Career application not found');
        }

        const career = rows[0];

        res.render('admin/career-view', {
            adminUsername: req.session.adminUsername,
            career
        });
    } catch (error) {
        console.error('Error fetching career details:', error);
        res.redirect('/admin/careers?error=Error loading career details');
    }
});

// Query Management Page with Pagination and Search
router.get('/queries', requireAuth, async (req, res) => {
    try {
        const searchQuery = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 5; // 5 items per page
        const offset = (page - 1) * limit;

        let queries, totalCount;
        let whereClause = '';
        let queryParams = [];

        if (searchQuery) {
            const like = `%${searchQuery}%`;
            whereClause = `
                WHERE 
                    NAME LIKE ? OR 
                    EMAIL LIKE ? OR 
                    MOBILE_NO LIKE ? OR
                    SUBJECT_QUERY LIKE ?
            `;
            queryParams = [like, like, like, like];
        }

        // Get total count
        let countSql = 'SELECT COUNT(*) as total FROM query';
        if (whereClause) {
            countSql += ' ' + whereClause;
        }
        const [countResult] = await db.execute(countSql, queryParams);
        totalCount = countResult[0].total;
        const totalPages = Math.ceil(totalCount / limit);

        // Get paginated queries
        let dataSql = 'SELECT * FROM query';
        if (whereClause) {
            dataSql += ' ' + whereClause;
        }
        dataSql += ' ORDER BY ID DESC LIMIT ? OFFSET ?';
        const dataParams = [...queryParams, limit, offset];
        [queries] = await db.execute(dataSql, dataParams);

        res.render('admin/queries', {
            queries: queries || [],
            searchQuery,
            adminUsername: req.session.adminUsername,
            currentPage: page,
            totalPages,
            totalCount,
            limit
        });
    } catch (error) {
        console.error('Error fetching queries:', error);
        res.render('admin/queries', {
            queries: [],
            searchQuery: '',
            adminUsername: req.session.adminUsername,
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            limit: 5,
            error: 'Error loading queries data'
        });
    }
});

// Query Details View Page
router.get('/queries/:id', requireAuth, async (req, res) => {
    try {
        const queryId = req.params.id;
        if (!queryId) {
            return res.redirect('/admin/queries?error=Invalid query ID');
        }

        const [rows] = await db.execute('SELECT * FROM query WHERE ID = ?', [queryId]);
        if (rows.length === 0) {
            return res.redirect('/admin/queries?error=Query not found');
        }

        const queryRow = rows[0];

        res.render('admin/query-view', {
            adminUsername: req.session.adminUsername,
            queryRow
        });
    } catch (error) {
        console.error('Error fetching query details:', error);
        res.redirect('/admin/queries?error=Error loading query details');
    }
});

// Contact Management Page with Pagination and Search
router.get('/contacts', requireAuth, async (req, res) => {
    try {
        const searchQuery = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 5; // 5 items per page
        const offset = (page - 1) * limit;

        let contacts, totalCount;
        let whereClause = '';
        let queryParams = [];

        if (searchQuery) {
            const like = `%${searchQuery}%`;
            whereClause = `
                WHERE 
                    FULL_NAME LIKE ? OR 
                    EMAIL LIKE ? OR 
                    PHONE LIKE ? OR
                    STATUS LIKE ?
            `;
            queryParams = [like, like, like, like];
        }

        // Get total count
        let countSql = 'SELECT COUNT(*) as total FROM contact_submissions';
        if (whereClause) {
            countSql += ' ' + whereClause;
        }
        const [countResult] = await db.execute(countSql, queryParams);
        totalCount = countResult[0].total;
        const totalPages = Math.ceil(totalCount / limit);

        // Get paginated contacts
        let dataSql = 'SELECT * FROM contact_submissions';
        if (whereClause) {
            dataSql += ' ' + whereClause;
        }
        dataSql += ' ORDER BY CREATED_AT DESC LIMIT ? OFFSET ?';
        const dataParams = [...queryParams, limit, offset];
        [contacts] = await db.execute(dataSql, dataParams);

        res.render('admin/contacts', {
            contacts: contacts || [],
            searchQuery,
            adminUsername: req.session.adminUsername,
            currentPage: page,
            totalPages,
            totalCount,
            limit
        });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.render('admin/contacts', {
            contacts: [],
            searchQuery: '',
            adminUsername: req.session.adminUsername,
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            limit: 5,
            error: 'Error loading contact submissions data'
        });
    }
});

// Contact Details View Page
router.get('/contacts/:id', requireAuth, async (req, res) => {
    try {
        const contactId = req.params.id;
        if (!contactId) {
            return res.redirect('/admin/contacts?error=Invalid contact ID');
        }

        const [rows] = await db.execute('SELECT * FROM contact_submissions WHERE ID = ?', [contactId]);
        if (rows.length === 0) {
            return res.redirect('/admin/contacts?error=Contact submission not found');
        }

        const contact = rows[0];

        // If the contact is still NEW, mark it as REVIEWED when viewed
        if (contact.STATUS === 'NEW') {
            await db.execute('UPDATE contact_submissions SET STATUS = ? WHERE ID = ?', ['REVIEWED', contactId]);
            contact.STATUS = 'REVIEWED';
        }

        res.render('admin/contact-view', {
            adminUsername: req.session.adminUsername,
            contact
        });
    } catch (error) {
        console.error('Error fetching contact details:', error);
        res.redirect('/admin/contacts?error=Error loading contact details');
    }
});

module.exports = router;

