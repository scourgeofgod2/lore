function loremistressApp() {
    return {
        // --- STATE (Veri ve Durumlar) ---
        projectName: '',
        selectedFile: null,
        fileName: '',
        fileUrl: '',
        isDragging: false,
        isLoading: false,
        isCreatingVideo: false,
        videoLink: '',
        transcript: '',
        shots: [],
        error: '',

        // --- DEĞİŞMEZLER ---
        // Sunucu adresini tek bir yerden yönetmek en iyisidir
        serverUrl: 'http://129.154.239.84:3000',

        // --- METHODS (Fonksiyonlar) ---

        handleFileSelect(file) {
            if (file && file.type.startsWith('audio/')) {
                this.selectedFile = file;
                this.fileName = file.name;
                this.projectName = file.name.split('.').slice(0, -1).join('.');
                this.fileUrl = URL.createObjectURL(file);
                this.error = '';
                this.transcript = '';
                this.shots = [];
                this.videoLink = '';
            } else {
                this.error = 'Lütfen geçerli bir ses dosyası seçin.';
            }
        },

        handleFileDrop(event) {
            this.isDragging = false;
            const files = event.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        },

        async processAudio() {
            if (!this.selectedFile || !this.projectName.trim()) {
                this.error = "Lütfen bir ses dosyası seçin ve proje adı girin.";
                return;
            }
            this.isLoading = true;
            this.error = '';
            this.transcript = '';
            this.shots = [];
            this.videoLink = '';

            const formData = new FormData();
            formData.append('audioFile', this.selectedFile);
            formData.append('projectName', this.projectName.trim());

            try {
                // DÜZELTİLDİ: Sunucu IP'si kullanılıyor
                const response = await fetch(`${this.serverUrl}/process-audio`, {
                    method: 'POST',
                    body: formData,
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Sunucu hatası: ${response.statusText}`);
                }
                const results = await response.json();
                this.transcript = results.transcript;
                this.shots = results.shots.map(shot => ({ ...shot, imageUrl: null, isGenerating: false }));
            } catch (err) {
                this.error = `Bir hata oluştu: ${err.message}`;
            } finally {
                this.isLoading = false;
            }
        },

        async generateImage(shot, index) {
            if (!this.projectName.trim()) {
                this.error = "Görsel üretmeden önce bir proje adı belirlemelisiniz.";
                return;
            }
            shot.isGenerating = true;
            this.error = '';

            try {
                const styleSignature = " in the style of a dark, gritty graphic novel, with heavy inks and high contrast.";
                const finalPrompt = "Epic grimdark digital painting, " + shot.scene_description + styleSignature;
                
                // DÜZELTİLDİ: fetch komutu tamamen düzeltildi
                const response = await fetch(`${this.serverUrl}/generate-image`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        prompt: finalPrompt, 
                        index: index, 
                        projectName: this.projectName.trim(),
                        timestamp: shot.timestamp
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Görsel üretilemedi.`);
                }

                const data = await response.json();
                shot.imageUrl = data.imageUrl;
            } catch (err) {
                this.error = `Görsel üretme hatası: ${err.message}`;
            } finally {
                shot.isGenerating = false;
            }
        },

        async createVideo() {
            if (!this.projectName.trim() || !this.selectedFile) {
                this.error = "Video oluşturmak için bir proje ve yüklenmiş bir ses dosyası olmalı.";
                return;
            }
            this.isCreatingVideo = true;
            this.videoLink = '';
            this.error = '';

            try {
                const originalExtension = this.selectedFile.name.substring(this.selectedFile.name.lastIndexOf('.'));
                // DÜZELTİLDİ: Sunucu IP'si kullanılıyor
                const response = await fetch(`${this.serverUrl}/create-video`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        projectName: this.projectName.trim(),
                        audioFileName: `audio${originalExtension}`
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Video oluşturulamadı.`);
                }

                const data = await response.json();
                alert('Video başarıyla oluşturuldu! Sunucudaki downloads klasörünü kontrol edin.');
                
                const safeProjectName = this.projectName.trim().replace(/[^a-z0-9\s_-]/gi, '').trim().replace(/[\s_]+/g, '-');
                // DÜZELTİLDİ: Video linki sunucu IP'sini içeriyor
                this.videoLink = `${this.serverUrl}/downloads/${safeProjectName}/${data.videoFile}`;

            } catch (err) {
                this.error = `Video oluşturma hatası: ${err.message}`;
            } finally {
                this.isCreatingVideo = false;
            }
        }
    }
}
