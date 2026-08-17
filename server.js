const express = require('express');
const path = require('path');
// Используем sqlite3-async-await или promisify для надежной работы
// В данном случае, мы используем нативные промисы для sqlite
const sqlite3 = require('sqlite3').verbose(); 
const multer = require('multer');
const nodemailer = require('nodemailer'); // Для отправки почты
const fs = require('fs'); // Для работы с файловой системой (например, для удаления старых изображений)

const app = express();
const PORT = 3000;

// === НАСТРОЙКИ ===
// УЧЕТНЫЕ ДАННЫЕ АДМИНА
const ADMIN_LOGIN = "admin";
const ADMIN_PASS = "12345"; 

// --- НАСТРОЙКИ ПОЧТЫ (ОБЯЗАТЕЛЬНО ЗАМЕНИТЕ ЭТИ ДАННЫЕ!) ---
const SENDER_EMAIL = "anti.nastya.club@gmail.com"; 
const SENDER_PASSWORD = "rvscumilgelnvnvk"; // App Password
// -----------------------------------------------------------

// === КОНФИГУРАЦИЯ ТРАНСПОРТЕРА NODEMAILER ===
const transporter = nodemailer.createTransport({
    service: 'gmail', // Можно заменить на 'outlook', 'sendgrid' и т.д.
    auth: {
        user: SENDER_EMAIL,
        pass: SENDER_PASSWORD
    }
});


// === БАЗА ДАННЫХ ===
const db = new sqlite3.Database('./shop.db');

// Обертка для DB.run (для использования await)
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, changes: this.changes });
    });
});

// Обертка для DB.get
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
    });
});

// Обертка для DB.all
const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
    });
});


db.serialize(() => {
    // 1. ТАБЛИЦА ТОВАРОВ
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        price TEXT,
        ref TEXT,
        images TEXT, 
        colors TEXT,
        stock TEXT,
        category TEXT,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        isVisible INTEGER DEFAULT 1,
        isDrop INTEGER DEFAULT 0
    )`);

    // 2. ТАБЛИЦА КОЛЛЕКЦИЙ
    db.run(`CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT UNIQUE
    )`);

    // 3. ТАБЛИЦА ЗАКАЗОВ
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        customer TEXT,
        items TEXT,
        total TEXT,
        status TEXT DEFAULT 'new'
    )`);
});


// === НАСТРОЙКИ ЗАГРУЗКИ ФАЙЛОВ ===
const storage = multer.diskStorage({
    destination: './public/img/',
    filename: function(req, file, cb) {
        // Защита от дубликатов: добавляем timestamp к имени
        cb(null, Date.now() + '-' + file.originalname.replace(/ /g, '_')); 
    }
});
const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());


// === ЗАЩИТА: MIDDLEWARE АВТОРИЗАЦИИ ===
const checkAuth = (req, res, next) => {
    const auth = { login: ADMIN_LOGIN, password: ADMIN_PASS };
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
    if (login && password && login === auth.login && password === auth.password) return next();
    res.set('WWW-Authenticate', 'Basic realm="404"');
    res.status(401).send('ACCESS DENIED');
};


// === ФУНКЦИЯ ОТПРАВКИ EMAIL ===
function sendOrderEmail(orderId, customerEmail, customerName, items, total) {
    if (SENDER_EMAIL === "ВАШ_АДРЕС_GMAIL@gmail.com") {
        console.warn('WARNING: Email settings are not configured. Skipping email sending.');
        return;
    }
    
    const itemsHtml = items.map(item => `
        <li style="margin-bottom: 5px;">
            ${item.title} (${item.size}, ${item.color}) — ${item.qty} шт. 
            <span style="font-weight: bold; float: right;">${item.price}</span>
        </li>
    `).join('');

    const mailOptions = {
        from: SENDER_EMAIL,
        to: customerEmail,
        subject: `[ANTI-NASTYA] Ваш заказ #${orderId} успешно оформлен`,
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
                <h1 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">
                    Спасибо за ваш заказ, ${customerName}!
                </h1>
                <p>Ваш номер заказа: <b style="color: #d9534f;">${orderId}</b></p>
                <p>Сумма: <b>${total}</b></p>
                <p>Вы можете проверить статус заказа по ссылке: 
                   <a href="http://localhost:${PORT}/status.html?id=${orderId}" style="color: #008cba;">
                   ПЕРЕЙТИ К СТАТУСУ</a></p>
                
                <h2 style="margin-top: 30px; border-top: 1px solid #ccc; padding-top: 15px;">
                    Детали заказа:
                </h2>
                <ul style="list-style: none; padding: 0;">${itemsHtml}</ul>
                <p style="margin-top: 30px; font-style: italic; color: #555;">
                    Мы свяжемся с вами в ближайшее время для подтверждения доставки.
                </p>
            </div>
        `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Ошибка отправки email:', error.message);
        } else {
            console.log('Email успешно отправлен: ' + info.response);
        }
    });
}


// === API ТОВАРОВ (CRUD + СОРТИРОВКА) ===

// GET ALL
app.get('/api/products', async (req, res) => {
    try {
        const rows = await dbAll("SELECT * FROM products ORDER BY sort_order ASC");
        const products = rows.map(p => ({
            ...p,
            images: JSON.parse(p.images || '[]'),
            colors: p.colors ? p.colors.split(',').filter(c => c.trim() !== '') : [],
            stock: JSON.parse(p.stock || '[]'),
            isVisible: !!p.isVisible,
            isDrop: !!p.isDrop
        }));
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET ONE
app.get('/api/products/:id', async (req, res) => {
    try {
        const row = await dbGet("SELECT * FROM products WHERE id = ?", [req.params.id]);
        if (!row) return res.status(404).json({ error: "Not found" });
        
        row.images = JSON.parse(row.images || '[]');
        row.colors = row.colors ? row.colors.split(',').filter(c => c.trim() !== '') : [];
        row.stock = JSON.parse(row.stock || '[]');
        row.isVisible = !!row.isVisible;
        row.isDrop = !!row.isDrop;
        res.json(row);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE
app.post('/api/products', checkAuth, upload.array('images', 10), async (req, res) => {
    const { title, price, ref, colors, stock, isVisible, category, description, isDrop } = req.body;
    const imagePaths = req.files.map(f => `img/${f.filename}`);
    const visibleInt = isVisible === 'true' ? 1 : 0;
    const dropInt = isDrop === 'true' ? 1 : 0;
    const stockVal = stock ? stock : '[]';

    const sql = `INSERT INTO products (title, price, ref, images, colors, stock, isVisible, category, description, isDrop, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 9999)`;
    try {
        const result = await dbRun(sql, [title, price, ref, JSON.stringify(imagePaths), colors, stockVal, visibleInt, category, description, dropInt]);
        res.json({ id: result.id, status: "success" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE
app.put('/api/products/:id', checkAuth, upload.array('images', 10), async (req, res) => {
    const { title, price, ref, colors, stock, isVisible, category, description, isDrop } = req.body;
    const id = req.params.id;

    try {
        const row = await dbGet("SELECT images FROM products WHERE id = ?", [id]);
        if (!row) return res.status(404).json({ error: "Not found" });
        
        // Если новые изображения загружены, используем их, иначе старые
        let newImages = (req.files && req.files.length > 0) ? req.files.map(f => `img/${f.filename}`) : JSON.parse(row.images);
        
        // Если флаг keepOldImages не установлен, удаляем старые файлы (опционально)
        // if (!req.body.keepOldImages && req.files && req.files.length > 0) {
        //     JSON.parse(row.images).forEach(imagePath => {
        //         fs.unlink(path.join(__dirname, 'public', imagePath), (err) => {
        //             if (err) console.error('Failed to delete old image:', imagePath, err);
        //         });
        //     });
        // }

        const visibleInt = isVisible === 'true' ? 1 : 0;
        const dropInt = isDrop === 'true' ? 1 : 0;
        const stockVal = stock ? stock : '[]';
        
        const sql = `UPDATE products SET title=?, price=?, ref=?, images=?, colors=?, stock=?, isVisible=?, category=?, description=?, isDrop=? WHERE id=?`;
        await dbRun(sql, [title, price, ref, JSON.stringify(newImages), colors, stockVal, visibleInt, category, description, dropInt, id]);
        res.json({ status: "updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE
app.delete('/api/products/:id', checkAuth, async (req, res) => {
    try {
        const row = await dbGet("SELECT images FROM products WHERE id = ?", req.params.id);
        if (row) {
            // Опционально: удаление файлов изображений
            JSON.parse(row.images).forEach(imagePath => {
                fs.unlink(path.join(__dirname, 'public', imagePath), (err) => {
                    if (err) console.error('Failed to delete image file:', imagePath, err);
                });
            });
        }
        await dbRun("DELETE FROM products WHERE id = ?", req.params.id);
        res.json({ status: "deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// REORDER (СОРТИРОВКА)
app.post('/api/reorder', checkAuth, async (req, res) => {
    const { order } = req.body;
    try {
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            const stmt = db.prepare("UPDATE products SET sort_order = ? WHERE id = ?");
            order.forEach((id, index) => stmt.run(index, id));
            stmt.finalize();
            db.run("COMMIT", (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ status: "reordered" });
            });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// === API КОЛЛЕКЦИЙ (Collections) ===
app.get('/api/collections', async (req, res) => {
    try {
        const rows = await dbAll("SELECT * FROM collections");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/collections', checkAuth, async (req, res) => {
    try {
        const title = req.body.title.toUpperCase();
        const result = await dbRun("INSERT INTO collections (title) VALUES (?)", [title]);
        res.json({ id: result.id, title });
    } catch (err) {
        // Ошибка 19: UNIQUE constraint failed
        if (err.errno === 19) return res.status(409).json({ error: "Collection already exists." });
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/collections/:id', checkAuth, async (req, res) => {
    try {
        await dbRun("DELETE FROM collections WHERE id = ?", req.params.id);
        res.json({ status: "deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// === API ЗАКАЗОВ (ORDERS) ===

// POST: Создание заказа (Клиентская часть)
app.post('/api/orders', async (req, res) => {
    const { customer, items, total } = req.body;
    const date = new Date().toISOString();
    
    // Валидация данных
    if (!customer || !customer.email || !items || !total) {
        return res.status(400).json({ error: "Missing required order data." });
    }

    try {
        const result = await dbRun(`INSERT INTO orders (date, customer, items, total, status) VALUES (?, ?, ?, ?, 'new')`, 
        [date, JSON.stringify(customer), JSON.stringify(items), total]);
        
        const orderId = result.id;

        // Отправка email клиенту
        sendOrderEmail(orderId, customer.email, customer.name, items, total);
        
        res.json({ status: "success", orderId: orderId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET: Получить все заказы (Админка)
app.get('/api/orders', checkAuth, async (req, res) => {
    try {
        const rows = await dbAll("SELECT * FROM orders ORDER BY id DESC");
        const orders = rows.map(o => {
            try {
                return {
                    ...o,
                    customer: JSON.parse(o.customer || '{}'),
                    items: JSON.parse(o.items || '[]')
                };
            } catch (e) {
                console.error('Failed to parse order JSON for ID:', o.id, e);
                return { ...o, customer: {}, items: [] }; // Возвращаем пустые объекты
            }
        });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT: Обновить статус заказа (Админка)
app.put('/api/orders/:id', checkAuth, async (req, res) => {
    const { status } = req.body;
    try {
        await dbRun("UPDATE orders SET status = ? WHERE id = ?", [status, req.params.id]);
        res.json({ status: "updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE: Удалить заказ (Админка)
app.delete('/api/orders/:id', checkAuth, async (req, res) => {
    try {
        await dbRun("DELETE FROM orders WHERE id = ?", req.params.id);
        res.json({ status: "deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET: Проверка статуса заказа по ID (Клиентская часть, публичный API)
app.get('/api/order/status/:id', async (req, res) => {
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) {
        return res.status(400).json({ error: 'Неверный формат ID заказа.' });
    }

    try {
        const row = await dbGet("SELECT id, status, customer, items, total FROM orders WHERE id = ?", [orderId]);
        
        if (!row) {
            return res.status(404).json({ error: 'Заказ с таким ID не найден.' });
        }
        
        // Парсинг JSON
        const customerData = JSON.parse(row.customer || '{}');
        const itemsData = JSON.parse(row.items || '[]');

        // Возвращаем только публичные данные
        res.json({
            id: row.id,
            status: row.status,
            customerName: customerData.name,
            items: itemsData,
            total: row.total
        });

    } catch (e) {
        console.error('Ошибка при получении статуса заказа:', e);
        res.status(500).json({ error: 'Ошибка сервера при получении заказа.' });
    }
});


// === РОУТЫ СТРАНИЦ ===
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/shop', (req, res) => res.sendFile(path.join(__dirname, 'public', 'shop.html')));
app.get('/product.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'product.html')));
app.get('/checkout.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'checkout.html')));
app.get('/status.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'status.html')));
app.get('/admin', checkAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard_panel.html')));


// === ЗАПУСК СЕРВЕРА ===
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});