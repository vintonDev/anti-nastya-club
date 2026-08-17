// ==========================================
// 1. ГЛОБАЛЬНЫЙ КУРСОР (РАБОТАЕТ ВЕЗДЕ)
// ==========================================
const cursorData = document.querySelector('.cursor-data');
const cursorText = document.querySelector('.cursor-xy');

// Проверяем, есть ли HTML-элементы курсора на странице
if (cursorData && cursorText) {
    document.addEventListener('mousemove', (e) => {
        // Курсор ровно под мышкой
        cursorData.style.left = e.clientX + 'px';
        cursorData.style.top = e.clientY + 'px';
        
        // Обновляем координаты
        cursorText.innerHTML = `X: ${e.clientX}<br>Y: ${e.clientY}`;
    });

    // Эффект при наведении на ссылки и товары
    // Используем делегирование событий для поддержки динамических товаров
    document.body.addEventListener('mouseover', (e) => {
        if (e.target.closest('a, button, .nav-btn, .product-card, .size-btn')) {
            document.body.classList.add('hovered');
        }
    });

    document.body.addEventListener('mouseout', (e) => {
        if (e.target.closest('a, button, .nav-btn, .product-card, .size-btn')) {
            document.body.classList.remove('hovered');
        }
    });
}

// ==========================================
// 2. ЛОГИКА ГЛАВНОЙ СТРАНИЦЫ (ФУТБОЛКА + ТЕКСТ)
// ==========================================
// Этот код выполняется ТОЛЬКО если на странице есть canvas
const canvas = document.getElementById('tshirt-canvas');

if (canvas) {
    const context = canvas.getContext('2d');

    // === ТВОИ НАСТРОЙКИ ===
    const SETTINGS = {
        // === НАСТРОЙКИ КАРТИНОК ===
        // Важно: Убедись, что папки называются именно так в папке public!
        sequenceParts: [
            // ПАПКА 1 (Интро)
            { 
                folder: '/black sequence/', // Если не переименовал, верни старое название
                fileNamePrefix: 'frame',    
                fileExtension: '.png',      
                totalFiles: 221,   
                trimStart: 0,     
                trimEnd: 21        
            },
            // ПАПКА 2 (Цикл)
            { 
                folder: '/rotating black sequence/', // Если не переименовал, верни старое название
                fileNamePrefix: 'frame',    
                fileExtension: '.png',
                totalFiles: 221,   
                trimStart: 0,     
                trimEnd: 21        
            }
        ],

        fps: 60,

        // === НАСТРОЙКИ ТЕКСТА ===
        textPhrase: "ANTI-NASTYA CLUB ", 
        textScrollDuration: 45,  
        rowCount: 12,            
        lineHeightRatio: 0.85,  
        coverageScale: 0.5, 
        debugMode: false 
    };

    // ПЕРЕМЕННЫЕ
    const images = []; 
    let loopStartIndex = 0;
    let totalFramesToLoad = 0;
    let framesLoaded = 0;

    // === ФУНКЦИЯ ЗАГРУЗКИ ===
    function initTshirtAnimation() {
        console.log("Начинаю загрузку секвенции...");

        // Считаем общее количество кадров
        SETTINGS.sequenceParts.forEach(part => {
            part.framesToUse = part.totalFiles - part.trimStart - part.trimEnd;
            totalFramesToLoad += part.framesToUse;
        });

        // Запоминаем, где начинается цикл
        loopStartIndex = SETTINGS.sequenceParts[0].framesToUse;

        // Загружаем папки
        SETTINGS.sequenceParts.forEach(part => {
            for (let i = 0; i < part.framesToUse; i++) {
                const frameNum = 1 + part.trimStart + i;
                const img = new Image();
                const paddedNum = String(frameNum).padStart(4, '0');
                
                // Формируем путь
                const CDN_BASE = 'https://cdn.jsdelivr.net/gh/vintonDev/anti-nastya-club@main';
                img.src = `${CDN_BASE}${part.folder}${part.fileNamePrefix}${paddedNum}${part.fileExtension}`;
                
                img.onload = () => {
                    framesLoaded++;
                    
                    // Как только загрузили первую картинку - задаем размеры канваса
                    if (canvas.width === 0 || canvas.width === 300) { 
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        setTimeout(generateTextWall, 100);
                    }

                    // Если все загрузилось - старт
                    if (framesLoaded === totalFramesToLoad) {
                        startPlayback();
                    }
                };
                img.onerror = () => { console.error(`Не нашел файл: ${img.src}`); };
                images.push(img);
            }
        });
    }

    // === ПЛЕЕР ===
    let currentFrameIndex = 0;
    let lastFrameTime = 0;
    const frameInterval = 1000 / SETTINGS.fps;

    function render(time) {
        const deltaTime = time - lastFrameTime;

        if (deltaTime >= frameInterval && images.length > 0) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            const safeIndex = Math.min(currentFrameIndex, images.length - 1);
            context.drawImage(images[safeIndex], 0, 0, canvas.width, canvas.height);
            
            currentFrameIndex++;

            // Если дошли до конца, прыгаем на начало цикла
            if (currentFrameIndex >= images.length) {
                currentFrameIndex = loopStartIndex;
            }
            
            lastFrameTime = time - (deltaTime % frameInterval);
        }

        requestAnimationFrame(render);
    }

    function startPlayback() {
        requestAnimationFrame(render);
    }

    // === ГЕНЕРАТОР ТЕКСТА ===
    const textContainer = document.getElementById('text-wall');

    function generateTextWall() {
        if (!textContainer) return;

        const tshirtRect = canvas.getBoundingClientRect();
        const tshirtHeight = tshirtRect.height;

        // Если футболка еще не отрисовалась, ждем
        if (tshirtHeight < 10) {
            setTimeout(generateTextWall, 100);
            return;
        }

        textContainer.innerHTML = ''; 

        const totalTextHeight = tshirtHeight * SETTINGS.coverageScale;
        const singleRowHeight = totalTextHeight / SETTINGS.rowCount;
        const fontSize = singleRowHeight / SETTINGS.lineHeightRatio;

        for (let i = 0; i < SETTINGS.rowCount; i++) {
            createRow(i, singleRowHeight, fontSize);
        }
    }

    function createRow(index, heightPx, fontSizePx) {
        const row = document.createElement('div');
        row.className = 'marquee-row';
        if (index % 2 !== 0) row.classList.add('reverse'); 
        
        row.style.height = `${heightPx}px`;
        row.style.fontSize = `${fontSizePx}px`;
        row.style.lineHeight = SETTINGS.lineHeightRatio;

        const content = document.createElement('div');
        content.className = 'marquee-content';
        content.style.animationDuration = `${SETTINGS.textScrollDuration}s`;

        const charWidth = fontSizePx * 0.5;
        const phraseWidth = SETTINGS.textPhrase.length * charWidth;
        const repeatsNeeded = Math.ceil((window.innerWidth * 3) / phraseWidth); 

        let fullStringHtml = '';
        for (let j = 0; j < repeatsNeeded; j++) {
            fullStringHtml += `<span class="marquee-item">${SETTINGS.textPhrase}</span>`;
        }

        content.innerHTML = fullStringHtml + fullStringHtml; 
        row.appendChild(content);
        textContainer.appendChild(row);
    }

    // === ЗАПУСК ===
    initTshirtAnimation();

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(generateTextWall, 50);
    });

} else {
    console.log('Это не главная страница: Анимация выключена, курсор активен.');
}

// ==========================================
// 3. ЛОГИКА МАГАЗИНА (УМНЫЕ ФИЛЬТРЫ)
// ==========================================
const shopContainer = document.getElementById('shop-container');

if (shopContainer) {
    let allProducts = []; 

    // Используем Promise.all, чтобы дождаться загрузки И коллекций, И товаров
    Promise.all([
        fetch('/api/collections').then(res => res.json()),
        fetch('/api/products').then(res => res.json())
    ])
    .then(([collections, products]) => {
        // 1. Сохраняем только ВИДИМЫЕ товары
        allProducts = products.filter(p => p.isVisible);

        // 2. Собираем список категорий, в которых ЕСТЬ товары
        // Создаем Set (набор уникальных значений) из категорий товаров
        const activeCategories = new Set(allProducts.map(p => p.category));

        // 3. Рисуем кнопки фильтров
        const filtersContainer = document.querySelector('.category-filters');
        if (filtersContainer) {
            filtersContainer.innerHTML = '<button class="filter-btn active" data-cat="ALL">ALL</button>'; 
            
            collections.forEach(c => {
                // ПРОВЕРКА: Если в этой коллекции есть товары — рисуем кнопку
                if (activeCategories.has(c.title)) {
                    const btn = document.createElement('button');
                    btn.className = 'filter-btn';
                    btn.setAttribute('data-cat', c.title);
                    btn.innerText = c.title;
                    filtersContainer.appendChild(btn);
                }
            });

            // Вешаем обработчики на только что созданные кнопки
            initFilterClicks();
        }

        // 4. Рисуем все товары по умолчанию
        renderProducts('ALL');
    })
    .catch(err => console.error('Ошибка загрузки:', err));


    // --- ФУНКЦИЯ ОТРИСОВКИ ТОВАРОВ ---
    function renderProducts(category) {
        shopContainer.innerHTML = ''; 

        // Фильтруем (если ALL — берем все, иначе — по совпадению категории)
        // Для товаров без категории (если такие будут) они попадут только в ALL
        const filtered = (category === 'ALL') 
            ? allProducts 
            : allProducts.filter(p => p.category === category);

        if (filtered.length === 0) {
            // Этот блок сработает только если вручную удалить товары из базы, 
            // пока пользователь сидит на сайте, так как пустые кнопки мы уже скрыли.
            shopContainer.innerHTML = '<div style="color:#666; width:100%; text-align:center; padding-top:0px;">NO ITEMS HERE</div>';
            return;
        }

        filtered.forEach((product, index) => {
            let mainImage = (product.images && product.images.length > 0) ? product.images[0] : 'img/placeholder.jpg';
            
            // Формируем список размеров (S M L)
            const sizesList = (product.stock && product.stock.length > 0) 
                              ? `[${product.stock.map(s => s.size).join(' ')}]` 
                              : '';

            const card = document.createElement('a');
            card.href = `product.html?id=${product.id}`;
            card.className = 'product-card';
            card.style.animationDelay = `${index * 0.05}s`;

            card.innerHTML = `
                <div class="card-image">
                    <img src="${mainImage}" alt="${product.title}">
                    <div class="card-overlay">VIEW PRODUCT</div>
                </div>
                <div class="card-info">
                    <div class="card-title">${product.title}</div>
                    <div class="card-meta">
                        <span>${sizesList}</span>
                        <span>${product.price}</span>
                    </div>
                </div>
            `;
            shopContainer.appendChild(card);
        });
    }

    // --- ОБРАБОТЧИК КЛИКОВ ПО ФИЛЬТРАМ ---
    function initFilterClicks() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderProducts(btn.getAttribute('data-cat'));
            });
        });
    }
}

// ==========================================
// 4. ЛОГИКА КОРЗИНЫ (SHOPPING CART)
// ==========================================

let cart = []; // Массив товаров

// 1. ЗАГРУЗКА ПРИ СТАРТЕ
document.addEventListener('DOMContentLoaded', () => {
    // Загружаем из памяти браузера
    if(localStorage.getItem('myShopCart')) {
        cart = JSON.parse(localStorage.getItem('myShopCart'));
    }
    updateCartUI();

    // Вешаем клик на кнопку "CART (0)" в хедере
    const cartNavBtn = document.getElementById('nav-cart-btn');
    if(cartNavBtn) {
        cartNavBtn.href = "#";
        cartNavBtn.onclick = (e) => {
            e.preventDefault();
            toggleCart();
        };
    }
});

// Функция открытия/закрытия
function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    
    // Проверка, существуют ли элементы на этой странице
    if(sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
    } else {
        console.error("Cart elements not found! Check HTML.");
    }
}

// Закрытие по клику на фон (тоже должно быть в main.js)
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('cart-overlay');
    if(overlay) {
        overlay.onclick = toggleCart;
    }
});

// 3. ДОБАВИТЬ В КОРЗИНУ (Вызывается со страницы товара)
function addToCart(product, size, color) {
    // Генерируем уникальный ID для товара с конкретными опциями
    const uniqueId = `${product.id}-${size}-${color}`;
    
    // Проверяем, есть ли уже такой в корзине
    const existingItem = cart.find(item => item.uniqueId === uniqueId);

    if (existingItem) {
        existingItem.qty++; // Если есть, увеличиваем кол-во
    } else {
        // Если нет, добавляем новый
        cart.push({
            uniqueId: uniqueId,
            id: product.id,
            title: product.title,
            price: product.price, // Строка "$100.00"
            image: product.image,
            size: size,
            color: color,
            qty: 1
        });
    }

    saveCart();
    updateCartUI();
    toggleCart(); // Открываем корзину, чтобы показать результат
}

// 4. УДАЛИТЬ ТОВАР ПОЛНОСТЬЮ (Новая функция)
function removeItem(uniqueId) {
    cart = cart.filter(item => item.uniqueId !== uniqueId);
    saveCart();
    updateCartUI();
}

// 5. ИЗМЕНИТЬ КОЛ-ВО (Обновили, чтобы при минусе не удалялось мгновенно, если хочешь)
function changeQty(uniqueId, change) {
    const item = cart.find(i => i.uniqueId === uniqueId);
    if (!item) return;

    item.qty += change;

    if (item.qty <= 0) {
        // Если кол-во стало 0, спрашиваем или удаляем сразу
        removeItem(uniqueId); 
    } else {
        saveCart();
        updateCartUI();
    }
}

// 5. СОХРАНЕНИЕ
function saveCart() {
    localStorage.setItem('myShopCart', JSON.stringify(cart));
}

// 6. ОТРИСОВКА (UI)
function updateCartUI() {
    const container = document.getElementById('cart-items-container');
    const headerCount = document.getElementById('cart-count-header');
    const navCount = document.getElementById('nav-cart-btn'); 
    const totalEl = document.getElementById('cart-total-price');

    if (!container) return; 

    let totalQty = 0;
    let totalPrice = 0;

    container.innerHTML = '';

    if (cart.length === 0) {
        container.innerHTML = '<div style="color:#666; text-align:center; margin-top:50px;">CART IS EMPTY</div>';
    }

    cart.forEach(item => {
        totalQty += item.qty;
        
        // 1. ОЧИСТКА ЦЕНЫ ПЕРЕД ПОДСЧЕТОМ
        // Мы удаляем всё, что НЕ цифры и НЕ точка (удаляем $, ₴, пробелы)
        const cleanPrice = item.price.toString().replace(/[^0-9.]/g, '');
        const priceNumber = parseFloat(cleanPrice);
        
        totalPrice += priceNumber * item.qty;

        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <img src="${item.image}" class="cart-thumb">
            <div class="cart-details">
                <div class="cart-top-row">
                    <div>
                        <div class="cart-title">${item.title}</div>
                        <div class="cart-variant">${item.color} / ${item.size}</div>
                    </div>
                    <button class="delete-btn" onclick="removeItem('${item.uniqueId}')" title="Remove">×</button>
                </div>

                <div class="cart-bottom">
                    <div style="color:#fff;">${item.price}</div>
                    <div class="qty-controls">
                        <button class="qty-btn" onclick="changeQty('${item.uniqueId}', -1)">-</button>
                        <span style="font-size:0.9rem; color:#fff;">${item.qty}</span>
                        <button class="qty-btn" onclick="changeQty('${item.uniqueId}', 1)">+</button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(div);
    });

    if(headerCount) headerCount.innerText = totalQty;
    if(navCount) navCount.innerText = `CART (${totalQty})`;
    
    // 2. ВЫВОД ИТОГО С ГРИВНОЙ В КОНЦЕ
    // toFixed(0) убирает копейки (1200₴). Если нужны копейки, поставь toFixed(2)
    if(totalEl) totalEl.innerText = `${totalPrice.toFixed(0)}₴`;
}
