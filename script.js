class VideoCutterApp {
    constructor() {
        this.currentCaptcha = '';
        this.selectedDuration = 10; // Значение по умолчанию
        this.uploadedFile = null;
        this.currentClips = []; // Сохраняем клипы для доступа
        
        this.init();
    }

    init() {
        this.setupCaptcha();
        this.setupEventListeners();
        this.loadTelegramUser();
    }

    // CAPTCHA ФУНКЦИИ
    generateCaptcha() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let captcha = '';
        for (let i = 0; i < 6; i++) {
            captcha += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        this.currentCaptcha = captcha;
        return captcha;
    }

    displayCaptcha() {
        const captchaImage = document.getElementById('captcha-image');
        const captcha = this.generateCaptcha();
        
        // Создаем визуальную капчу с искажениями
        captchaImage.innerHTML = captcha.split('').map((char, index) => {
            const rotation = Math.random() * 40 - 20; // Увеличили разброс наклона
            const fontSize = 24 + Math.random() * 12; // Увеличили разброс размера
            const color = `hsl(${Math.random() * 90 + 160}, 70%, 75%)`; // Больше разброс цветов
            const translateY = Math.random() * 8 - 4; // Вертикальное смещение
            
            // Добавляем шумовые линии
            const noiseLines = Array.from({length: 2}, () => {
                const y = Math.random() * 100;
                const opacity = Math.random() * 0.3 + 0.1;
                return `<div style="
                    position: absolute;
                    top: ${y}%;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: rgba(255,255,255,${opacity});
                    transform: rotate(${Math.random() * 10 - 5}deg);
                "></div>`;
            }).join('');
            
            // Добавляем шумовые точки
            const noiseDots = Array.from({length: 5}, () => {
                const x = Math.random() * 100;
                const y = Math.random() * 100;
                const size = Math.random() * 3 + 1;
                const opacity = Math.random() * 0.5 + 0.2;
                return `<div style="
                    position: absolute;
                    top: ${y}%;
                    left: ${x}%;
                    width: ${size}px;
                    height: ${size}px;
                    background: rgba(255,255,255,${opacity});
                    border-radius: 50%;
                "></div>`;
            }).join('');
            
            return `<span style="
                display: inline-block;
                transform: rotate(${rotation}deg) translateY(${translateY}px);
                font-size: ${fontSize}px;
                color: ${color};
                margin: 0 3px;
                text-shadow: 2px 2px 3px rgba(0,0,0,0.4);
                position: relative;
                z-index: 2;
            ">${char}</span>`;
        }).join('');
        
        // Добавляем шумовой фон
        captchaImage.style.position = 'relative';
        captchaImage.innerHTML += `
            <div style="
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 2px,
                    rgba(255,255,255,0.03) 2px,
                    rgba(255,255,255,0.03) 4px
                );
                z-index: 1;
            "></div>
        `;
    }

    setupCaptcha() {
        this.displayCaptcha();
    }

    verifyCaptcha(input) {
        return input === this.currentCaptcha;
    }

    // TELEGRAM API
    loadTelegramUser() {
        console.log('Загрузка данных пользователя...');
        console.log('window.Telegram:', window.Telegram);
        
        // Проверяем доступность Telegram WebApp API
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            
            // Инициализируем WebApp
            tg.ready();
            tg.expand();
            
            console.log('Telegram WebApp готов');
            console.log('initDataUnsafe:', tg.initDataUnsafe);
            
            // Получаем данные пользователя
            let user = tg.initDataUnsafe?.user;
            
            if (user) {
                console.log('Пользователь найден:', user);
                this.displayUserInfo(user);
            } else {
                console.log('Пользователь не найден в initDataUnsafe');
                // Пробуем получить из initData
                if (tg.initData) {
                    try {
                        const urlParams = new URLSearchParams(tg.initData);
                        const userData = urlParams.get('user');
                        if (userData) {
                            user = JSON.parse(userData);
                            console.log('Пользователь получен из initData:', user);
                            this.displayUserInfo(user);
                        } else {
                            console.log('Пользователь не найден в initData');
                            this.displayUserInfo({
                                first_name: 'Пользователь',
                                last_name: '',
                                username: 'user',
                                photo_url: null
                            });
                        }
                    } catch (e) {
                        console.log('Ошибка парсинга initData:', e);
                        this.displayUserInfo({
                            first_name: 'Пользователь',
                            last_name: '',
                            username: 'user',
                            photo_url: null
                        });
                    }
                } else {
                    console.log('initData отсутствует');
                    this.displayUserInfo({
                        first_name: 'Пользователь',
                        last_name: '',
                        username: 'user',
                        photo_url: null
                    });
                }
            }
            
            // Настраиваем тему
            tg.setBackgroundColor('#000000');
            tg.setHeaderColor('#000000');
            
        } else {
            console.log('Telegram WebApp API не доступен');
            // Используем демо-данные
            this.displayUserInfo({
                first_name: 'Demo',
                last_name: 'User',
                username: 'demo_user',
                photo_url: null
            });
        }
    }

    displayUserInfo(user) {
        console.log('Отображение пользователя:', user);
        
        const avatar = document.getElementById('user-avatar');
        const name = document.getElementById('user-name');
        const username = document.getElementById('user-username');
        
        if (!avatar || !name || !username) {
            console.error('Элементы пользователя не найдены');
            return;
        }
        
        console.log('Данные пользователя:', {
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            photo_url: user.photo_url,
            id: user.id
        });
        
        // Аватар
        if (user.photo_url) {
            avatar.innerHTML = `<img src="${user.photo_url}" alt="${user.first_name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            console.log('Установлен аватар из photo_url:', user.photo_url);
        } else {
            // Используем первую букву имени
            const initial = (user.first_name ? user.first_name.charAt(0).toUpperCase() : 'U');
            avatar.textContent = initial;
            avatar.style.display = 'flex';
            avatar.style.alignItems = 'center';
            avatar.style.justifyContent = 'center';
            avatar.style.fontSize = '20px';
            avatar.style.fontWeight = 'bold';
            avatar.style.background = '#333';
            console.log('Установлена заглушка аватара');
        }
        
        // Имя и фамилия
        const fullName = user.first_name + (user.last_name ? ' ' + user.last_name : '');
        name.textContent = fullName || 'Пользователь';
        
        // Username
        username.textContent = user.username ? '@' + user.username : '';
        
        console.log('Установлены имя и юзернейм:', {fullName, username: user.username});
    }

    // ОБРАБОТЧИКИ СОБЫТИЙ
    setupEventListeners() {
        console.log('Настройка обработчиков событий...');
        
        // CAPTCHA
        const captchaSubmit = document.getElementById('captcha-submit');
        const captchaInput = document.getElementById('captcha-input');
        
        if (captchaSubmit) {
            captchaSubmit.addEventListener('click', () => {
                this.handleCaptchaSubmit();
            });
        }
        
        if (captchaInput) {
            captchaInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleCaptchaSubmit();
                }
            });
        }

        // Кнопки длительности
        document.querySelectorAll('.duration-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectDuration(btn);
            });
        });

        // Кнопка открытия клипов
        const openClipsBtn = document.getElementById('open-clips-btn');
        if (openClipsBtn) {
            openClipsBtn.addEventListener('click', () => {
                this.openClipsFolder();
            });
        }

        // Загрузка видео
        const uploadArea = document.getElementById('upload-area');
        const videoInput = document.getElementById('video-input');

        if (uploadArea && videoInput) {
            uploadArea.addEventListener('click', () => {
                videoInput.click();
            });

            videoInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files[0]);
            });

            // Drag & Drop
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFileSelect(files[0]);
                }
            });
        }
        
        console.log('Обработчики событий настроены');
    }

    // ОБРАБОТКА CAPTCHA
    handleCaptchaSubmit() {
        const input = document.getElementById('captcha-input');
        const error = document.getElementById('captcha-error');
        
        if (this.verifyCaptcha(input.value)) {
            this.switchToMainScreen();
        } else {
            error.textContent = 'Попробуй ввести капчу заново';
            input.value = '';
            this.displayCaptcha();
            
            setTimeout(() => {
                error.textContent = '';
            }, 3000);
        }
    }

    switchToMainScreen() {
        document.getElementById('captcha-screen').classList.remove('active');
        document.getElementById('main-screen').classList.add('active');
        document.getElementById('main-screen').classList.add('fade-in');
    }

    // ВЫБОР ДЛИТЕЛЬНОСТИ
    selectDuration(btn) {
        document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        
        // Гарантируем, что значение является числом
        const durationValue = parseInt(btn.dataset.duration);
        this.selectedDuration = durationValue;
        
        console.log(`ВЫБРАНА ДЛИТЕЛЬНОСТЬ: ${durationValue} секунд`);
        console.log(`this.selectedDuration = ${this.selectedDuration} (тип: ${typeof this.selectedDuration})`);
        
        // Показываем область загрузки
        document.getElementById('upload-container').classList.add('slide-up');
        
        // НЕ сбрасываем результаты при выборе длительности - только при новой загрузке
        // this.resetUploadState();
    }

    // ОБРАБОТКА ФАЙЛА
    handleFileSelect(file) {
        if (!file || !file.type.startsWith('video/')) {
            alert('Пожалуйста, выберите видеофайл');
            return;
        }

        // Гарантируем, что duration всегда имеет значение (по умолчанию 10)
        if (!this.selectedDuration || typeof this.selectedDuration !== 'number' || this.selectedDuration <= 0) {
            this.selectedDuration = 10; // Значение по умолчанию
            console.log(`Используем длительность по умолчанию: ${this.selectedDuration} секунд`);
        }

        this.uploadedFile = file;
        this.showProcessingState();
        
        // Отправляем видео на сервер для нарезки
        this.uploadVideo(file);
    }

    // ЗАГРУЗКА ВИДЕО НА СЕРВЕР
    async uploadVideo(file) {
        console.log(`ОТПРАВКА: this.selectedDuration = ${this.selectedDuration} (тип: ${typeof this.selectedDuration})`);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('duration', this.selectedDuration);

        console.log(`FormData содержит duration: ${formData.has('duration')}`);

        try {
            const response = await fetch('/upload-video', {
                method: 'POST',
                body: formData
            });

            console.log('=== ОТВЕТ СЕРВЕРА ===');
            console.log('response.status:', response.status);
            console.log('response.ok:', response.ok);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('=== JSON ОТВЕТ ===');
            console.log('result:', result);
            console.log('result.success:', result.success);
            console.log('result.clips:', result.clips);
            console.log('result.clips_count:', result.clips_count);
            console.log('result.message:', result.message);

            if (result.success) {
                this.showResults(result);
            } else {
                throw new Error(result.message || 'Ошибка обработки видео');
            }
        } catch (error) {
            console.error('Ошибка загрузки видео:', error);
            alert('Ошибка при загрузке видео: ' + error.message);
            this.resetUploadState(); // Сброс только при ошибке
        }
    }

    // СОСТОЯНИЕ ОБРАБОТКИ
    showProcessingState() {
        const uploadArea = document.getElementById('upload-area');
        const processingState = document.getElementById('processing-state');
        
        uploadArea.style.display = 'none';
        processingState.style.display = 'block';
        processingState.classList.add('fade-in');
    }

    // РЕЗУЛЬТАТ
    showResults(result) {
        console.log('=== ПОЛУЧЕН РЕЗУЛЬТАТ ОТ СЕРВЕРА ===');
        console.log('result:', result);
        console.log('result.success:', result.success);
        console.log('result.clips:', result.clips);
        console.log('result.clips_count:', result.clips_count);
        console.log('result.message:', result.message);
        
        const processingState = document.getElementById('processing-state');
        const resultsContainer = document.getElementById('results-container');
        
        if (!processingState || !resultsContainer) {
            console.error('Элементы для результатов не найдены');
            return;
        }
        
        processingState.style.display = 'none';
        resultsContainer.style.display = 'block';
        resultsContainer.classList.add('fade-in');
        
        // Логируем родительские элементы для диагностики
        console.log('=== ДИАГНОСТИКА HTML СТРУКТУРЫ ===');
        console.log('resultsContainer найден:', resultsContainer);
        console.log('Родитель results-container:', resultsContainer.parentElement);
        console.log('Классы родителя:', resultsContainer.parentElement ? resultsContainer.parentElement.classList : 'нет родителя');
        console.log('Стиль results-container:', resultsContainer.style.display);
        console.log('Стиль родителя:', resultsContainer.parentElement ? resultsContainer.parentElement.style.display : 'нет родителя');
        console.log('Есть ли у родителя класс active:', resultsContainer.parentElement ? resultsContainer.parentElement.classList.contains('active') : 'нет родителя');
        
        // Сохраняем клипы для доступа
        this.currentClips = result.clips || [];
        console.log('Сохранены клипы:', this.currentClips);
        console.log('Количество клипов:', this.currentClips.length);
        
        // Показываем диагностическое сообщение если клипов нет
        if (this.currentClips.length === 0) {
            const clipsList = document.getElementById('clips-list');
            if (clipsList) {
                clipsList.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #999;">
                        <p>📹 Клипы созданы, но список пуст</p>
                        <p style="font-size: 14px; margin-top: 10px;">
                            Количество: ${result.clips_count || 0}<br>
                            Длительность: ${result.duration || 'неизвестно'} сек
                        </p>
                    </div>
                `;
            }
        }
        
        // Показываем сообщение об успехе
        if (result.message) {
            console.log('SUCCESS:', result.message);
            // alert(result.message); // Временно отключен для диагностики
        }
        
        console.log('=== ФУНКЦИЯ showResults() ЗАВЕРШЕНА ===');
        console.log('resultsContainer.display:', resultsContainer.style.display);
        console.log('resultsContainer.classList:', resultsContainer.classList);
        console.log('resultsContainer.innerHTML:', resultsContainer.innerHTML);
        console.log('resultsContainer.children.length:', resultsContainer.children.length);
        
        // Показываем все дочерние элементы
        for (let i = 0; i < resultsContainer.children.length; i++) {
            console.log(`Дочерний элемент ${i}:`, resultsContainer.children[i]);
            console.log(`Тег: ${resultsContainer.children[i].tagName}`);
            console.log(`ID: ${resultsContainer.children[i].id}`);
            console.log(`Классы: ${resultsContainer.children[i].className}`);
            console.log(`Стиль display: ${resultsContainer.children[i].style.display}`);
        }
        
        // Проверяем содержимое results-container
        if (resultsContainer.children.length === 0) {
            console.log('resultsContainer пуст - добавляем кнопку');
            const button = document.createElement('button');
            button.id = 'open-clips-btn';
            button.className = 'open-clips-btn';
            button.textContent = '📂 Открыть клипы';
            button.addEventListener('click', () => {
                this.openClipsFolder();
            });
            resultsContainer.appendChild(button);
            
            const folder = document.createElement('div');
            folder.id = 'clips-folder';
            folder.style.display = 'none';
            folder.innerHTML = '<h4>📁 Ваши клипы</h4><div class="clips-list" id="clips-list"></div>';
            resultsContainer.appendChild(folder);
        }
        
        // НЕ сбрасываем автоматически - ждем действия пользователя
    }

    // ОТКРЫТИЕ ВИРТУАЛЬНОЙ ПАПКИ
    openClipsFolder() {
        console.log('=== ОТКРЫТИЕ ПАПКИ С КЛИПАМИ ===');
        console.log('this.currentClips:', this.currentClips);
        console.log('Количество клипов:', this.currentClips.length);
        
        const clipsFolder = document.getElementById('clips-folder');
        const clipsList = document.getElementById('clips-list');
        
        if (!clipsFolder || !clipsList) {
            console.error('Элементы папки клипов не найдены');
            return;
        }
        
        // Переключаем видимость папки
        if (clipsFolder.style.display === 'none' || clipsFolder.style.display === '') {
            clipsFolder.style.display = 'block';
            
            if (this.currentClips.length === 0) {
                console.log('Нет клипов для отображения');
                // Диагностическое сообщение уже установлено в showResults
                return;
            }
            
            // Очищаем список перед добавлением новых клипов
            clipsList.innerHTML = '';
            
            // Отображаем список клипов
            this.currentClips.forEach((clip, index) => {
                const clipItem = document.createElement('div');
                clipItem.className = 'clip-item-list';
                
                const clipInfo = document.createElement('div');
                clipInfo.className = 'clip-info-list';
                
                const clipName = document.createElement('span');
                clipName.className = 'clip-name-list';
                clipName.textContent = '📹 ' + clip.split('/').pop();
                
                const clipIndex = document.createElement('span');
                clipIndex.className = 'clip-index';
                clipIndex.textContent = 'Клип ' + (index + 1);
                
                clipInfo.appendChild(clipName);
                clipInfo.appendChild(clipIndex);
                
                const clipActions = document.createElement('div');
                clipActions.className = 'clip-actions';
                
                const previewBtn = document.createElement('button');
                previewBtn.className = 'preview-btn';
                previewBtn.textContent = '👁️ Предпросмотр';
                previewBtn.addEventListener('click', () => {
                    this.previewClip(clip, index);
                });
                
                const downloadBtn = document.createElement('button');
                downloadBtn.className = 'download-btn';
                downloadBtn.textContent = '⬇️ Скачать';
                downloadBtn.addEventListener('click', () => {
                    this.downloadClip(clip, index);
                });
                
                clipActions.appendChild(previewBtn);
                clipActions.appendChild(downloadBtn);
                
                clipItem.appendChild(clipInfo);
                clipItem.appendChild(clipActions);
                
                clipsList.appendChild(clipItem);
            });
            
            console.log('Список клипов отображен');
        } else {
            clipsFolder.style.display = 'none';
            console.log('Папка клипов скрыта');
        }
    }

    // ПРЕДПРОСМОТР КЛИПА
    previewClip(clipUrl, index) {
        console.log('=== ПРЕДПРОСМОТР КЛИПА ===');
        console.log('clipUrl:', clipUrl);
        console.log('index:', index);
        
        const clipName = clipUrl.split('/').pop();
        
        // Создаем модальное окно для предпросмотра
        const modal = document.createElement('div');
        modal.className = 'preview-modal';
        
        const previewContent = document.createElement('div');
        previewContent.className = 'preview-content';
        
        const previewHeader = document.createElement('div');
        previewHeader.className = 'preview-header';
        
        const title = document.createElement('h3');
        title.textContent = 'Предпросмотр: ' + clipName;
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.textContent = '✖️';
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });
        
        previewHeader.appendChild(title);
        previewHeader.appendChild(closeBtn);
        
        const previewVideo = document.createElement('div');
        previewVideo.className = 'preview-video';
        
        const video = document.createElement('video');
        video.controls = true;
        video.width = '100%';
        video.style.maxHeight = '400px';
        
        const source = document.createElement('source');
        source.src = clipUrl;
        source.type = 'video/mp4';
        
        video.appendChild(source);
        video.appendChild(document.createTextNode('Ваш браузер не поддерживает видео.'));
        
        previewVideo.appendChild(video);
        previewContent.appendChild(previewHeader);
        previewContent.appendChild(previewVideo);
        modal.appendChild(previewContent);
        
        document.body.appendChild(modal);
        console.log('Модальное окно предпросмотра создано');
    }

    // СКАЧИВАНИЕ КЛИПА
    downloadClip(clipUrl, index) {
        console.log('=== СКАЧИВАНИЕ КЛИПА ===');
        console.log('clipUrl:', clipUrl);
        console.log('index:', index);
        
        const clipName = clipUrl.split('/').pop();
        
        // Создаем временную ссылку для скачивания
        const link = document.createElement('a');
        link.href = clipUrl;
        link.download = clipName;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('Скачивание клипа начато:', clipName);
    }

    // Сброс состояния загрузки
    resetUploadState() {
        const uploadArea = document.getElementById('upload-area');
        const processingState = document.getElementById('processing-state');
        const resultsContainer = document.getElementById('results-container');
        const clipsFolder = document.getElementById('clips-folder');
        
        uploadArea.style.display = 'flex';
        processingState.style.display = 'none';
        resultsContainer.style.display = 'none';
        clipsFolder.style.display = 'none'; // Скрываем папку клипов
        
        // Очищаем клипы
        this.currentClips = [];
    }

    // Полный сброс в начальное состояние
    resetToInitialState() {
        // Скрываем все экраны результатов
        this.resetUploadState();
        
        // Очищаем предыдущие клипы
        const clipsGrid = document.getElementById('clips-grid');
        clipsGrid.innerHTML = '';
        
        // Очищаем файловый инпут
        const videoInput = document.getElementById('video-input');
        videoInput.value = '';
        
        // НЕ сбрасываем выбранную длительность - пользователь может выбрать новую
        // Кнопки остаются активными для нового выбора
        
        // Показываем область выбора длительности (если была скрыта)
        const uploadContainer = document.getElementById('upload-container');
        if (uploadContainer) {
            uploadContainer.classList.remove('slide-up');
        }
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, инициализация приложения...');
    window.app = new VideoCutterApp();
    console.log('Приложение инициализировано');
});

// Поддержка Telegram WebApp
window.Telegram = window.Telegram || {};
window.Telegram.WebApp = window.Telegram.WebApp || {
    ready: () => {},
    setBackgroundColor: () => {},
    setHeaderColor: () => {},
    initDataUnsafe: {
        user: {
            first_name: 'Пользователь',
            last_name: '',
            username: 'user',
            photo_url: null
        }
    }
};
