document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_KEY = 'parkscan_demo_data';
    const mapContainer = document.getElementById('parking-map');
    
    // Elementy Statystyk
    const elTotal = document.getElementById('total-capacity');
    const elOccupied = document.getElementById('occupied-spots');
    const elFree = document.getElementById('free-spots');
    const elBar = document.getElementById('occupancy-bar');
    
    // Elementy Szczegółów
    const detailsPanel = document.querySelector('.detail-content');
    const placeholderText = document.querySelector('.placeholder-text');
    const elDetId = document.getElementById('det-id');
    const elDetStatus = document.getElementById('det-status');
    const elDetPlate = document.getElementById('det-plate');
    const elDetTime = document.getElementById('det-time');
    const elDetDuration = document.getElementById('det-duration');
    const elDetCost = document.getElementById('det-cost');
    
    const HOURLY_RATE = 10; // 10zł za godzinę

    let parkingData = null;
    let simulationInterval = null;
    let editMode = false;
    let occupancyHistory = []; // Historia obłożenia dla wykresu
    const MAX_HISTORY = 20; // Maksymalna liczba punktów na wykresie

    // 0. Inicjalizacja danych demo (jeśli nie istnieją)
    function initializeDemoData() {
        const sectors = [
            { name: "Sektor A", capacity: 10 },
            { name: "Sektor B", capacity: 10 },
            { name: "Sektor C", capacity: 10 },
            { name: "Sektor D", capacity: 10 }
        ];

        const demoData = {
            sectors: sectors.map((sector, sectorIndex) => {
                const spots = [];
                for (let i = 1; i <= sector.capacity; i++) {
                    const spotId = `${sector.name.charAt(sector.name.length - 1)}${i}`;
                    // Losowo zajmij około 30% miejsc
                    const isOccupied = Math.random() < 0.3;
                    spots.push({
                        id: spotId,
                        occupied: isOccupied,
                        plateNumber: isOccupied ? generatePlate() : null,
                        timestamp: isOccupied ? new Date().toISOString() : null
                    });
                }
                return {
                    name: sector.name,
                    capacity: sector.capacity,
                    spots: spots
                };
            })
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(demoData));
        
        // Inicjalizuj historię obłożenia
        const initialOccupancy = calculateOccupancy(demoData);
        occupancyHistory = [initialOccupancy];
        
        return demoData;
    }

    function calculateOccupancy(data) {
        let total = 0;
        let occupied = 0;
        data.sectors.forEach(sector => {
            total += sector.capacity;
            occupied += sector.spots.filter(s => s.occupied).length;
        });
        return total > 0 ? (occupied / total) * 100 : 0;
    }

    // 1. Ładowanie danych
    function loadData() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try {
                parkingData = JSON.parse(raw);
                // Sprawdź czy struktura danych jest poprawna
                if (!parkingData.sectors || !Array.isArray(parkingData.sectors)) {
                    parkingData = initializeDemoData();
                }
            } catch (e) {
                console.error('Błąd parsowania danych:', e);
                parkingData = initializeDemoData();
            }
        } else {
            // Brak danych - utwórz je automatycznie
            parkingData = initializeDemoData();
        }
        
        renderMap();
        updateStats();
        // Inicjalizuj historię jeśli jest pusta
        if (occupancyHistory.length === 0) {
            occupancyHistory.push(calculateOccupancy(parkingData));
        }
    }

    // 2. Renderowanie Mapy (Siatki)
    function renderMap() {
        mapContainer.innerHTML = ''; // Czyść mapę

        parkingData.sectors.forEach(sector => {
            // Tworzenie kontenera dla sektora
            const sectorDiv = document.createElement('div');
            sectorDiv.classList.add('sector');
            sectorDiv.setAttribute('data-name', sector.name);

            // Generowanie miejsc
            sector.spots.forEach(spot => {
                const spotDiv = document.createElement('div');
                spotDiv.classList.add('spot');
                spotDiv.id = `spot-${spot.id}`;
                
                if (spot.occupied) {
                    spotDiv.classList.add('occupied');
                } else {
                    spotDiv.classList.add('free');
                }

                // Dodaj klasę edit-mode jeśli tryb edycji jest włączony
                if (editMode) {
                    spotDiv.classList.add('edit-mode');
                }

                // Obsługa kliknięć
                let clickTimer = null;
                spotDiv.addEventListener('click', (e) => {
                    if (editMode) {
                        // W trybie edycji - podwójne kliknięcie zmienia status
                        if (clickTimer === null) {
                            clickTimer = setTimeout(() => {
                                // Pojedyncze kliknięcie - pokaż szczegóły
                                showDetails(spot);
                                clickTimer = null;
                            }, 300);
                        } else {
                            // Podwójne kliknięcie - zmień status
                            clearTimeout(clickTimer);
                            clickTimer = null;
                            toggleSpotStatus(spot);
                        }
                    } else {
                        // Normalny tryb - tylko szczegóły
                        showDetails(spot);
                    }
                });
                
                sectorDiv.appendChild(spotDiv);
            });

            mapContainer.appendChild(sectorDiv);
        });
    }

    // 3. Aktualizacja Statystyk
    function updateStats() {
        let total = 0;
        let occupied = 0;

        parkingData.sectors.forEach(sector => {
            total += sector.capacity;
            occupied += sector.spots.filter(s => s.occupied).length;
        });

        const free = total - occupied;
        const percent = (occupied / total) * 100;

        elTotal.textContent = total;
        elOccupied.textContent = occupied;
        elFree.textContent = free;
        elBar.style.width = `${percent}%`;

        // Zmiana koloru paska w zależności od obłożenia
        if(percent > 90) elBar.style.backgroundColor = '#e74c3c'; // Czerwony
        else if(percent > 50) elBar.style.backgroundColor = '#f1c40f'; // Żółty
        else elBar.style.backgroundColor = '#2ecc71'; // Zielony

        // Dodaj do historii obłożenia
        occupancyHistory.push(percent);
        if (occupancyHistory.length > MAX_HISTORY) {
            occupancyHistory.shift(); // Usuń najstarszy punkt
        }
    }

    // 4. Pokazywanie szczegółów
    function showDetails(spot) {
        placeholderText.style.display = 'none';
        detailsPanel.classList.remove('hidden');

        elDetId.textContent = spot.id;
        
        if (spot.occupied) {
            elDetStatus.textContent = "ZAJĘTE";
            elDetStatus.style.color = "var(--accent-color)";
            elDetPlate.parentElement.style.display = 'flex';
            elDetPlate.textContent = spot.plateNumber;
            
            // Formatowanie czasu wjazdu
            const date = new Date(spot.timestamp);
            elDetTime.textContent = date.toLocaleTimeString();
            
            // Oblicz czas zajęcia
            const now = new Date();
            const durationMs = now - date;
            const durationHours = durationMs / (1000 * 60 * 60);
            const hours = Math.floor(durationHours);
            const minutes = Math.floor((durationHours - hours) * 60);
            const seconds = Math.floor((durationMs % 60000) / 1000);
            
            // Formatuj czas zajęcia
            let durationText = '';
            if (hours > 0) {
                durationText = `${hours}h ${minutes}m ${seconds}s`;
            } else if (minutes > 0) {
                durationText = `${minutes}m ${seconds}s`;
            } else {
                durationText = `${seconds}s`;
            }
            elDetDuration.textContent = durationText;
            
            // Oblicz kwotę do zapłaty (zaokrąglone do 2 miejsc po przecinku)
            const cost = durationHours * HOURLY_RATE;
            elDetCost.textContent = `${cost.toFixed(2)} zł`;
            elDetCost.parentElement.style.display = 'flex';
            elDetDuration.parentElement.style.display = 'flex';
        } else {
            elDetStatus.textContent = "WOLNE";
            elDetStatus.style.color = "var(--success-color)";
            elDetPlate.parentElement.style.display = 'none';
            elDetTime.textContent = "-";
            elDetDuration.textContent = "-";
            elDetCost.textContent = "-";
            elDetDuration.parentElement.style.display = 'flex';
            elDetCost.parentElement.style.display = 'flex';
        }
    }

    // 5. Logika Symulacji (AI Simulation)
    const simButton = document.getElementById('toggle-sim');
    
    simButton.addEventListener('click', () => {
        if (simulationInterval) {
            clearInterval(simulationInterval);
            simulationInterval = null;
            simButton.textContent = "Uruchom Symulację AI";
            simButton.classList.remove('active');
        } else {
            simButton.textContent = "Zatrzymaj Symulację";
            simButton.classList.add('active');
            // Uruchom pętlę symulacji co 2 sekundy
            simulationInterval = setInterval(simulateTraffic, 2000);
        }
    });

    function simulateTraffic() {
        // 1. Wybierz losowy sektor
        const randomSectorIndex = Math.floor(Math.random() * parkingData.sectors.length);
        const sector = parkingData.sectors[randomSectorIndex];
        
        // 2. Wybierz losowe miejsce w sektorze
        const randomSpotIndex = Math.floor(Math.random() * sector.spots.length);
        const spot = sector.spots[randomSpotIndex];

        // 3. Zmień status
        spot.occupied = !spot.occupied;
        
        if (spot.occupied) {
            spot.plateNumber = generatePlate();
            spot.timestamp = new Date().toISOString();
        } else {
            spot.plateNumber = null;
            spot.timestamp = null;
        }

        // 4. Aktualizuj DOM (tylko to konkretne miejsce, żeby nie przerysowywać wszystkiego)
        const spotEl = document.getElementById(`spot-${spot.id}`);
        if (spot.occupied) {
            spotEl.classList.remove('free');
            spotEl.classList.add('occupied');
        } else {
            spotEl.classList.remove('occupied');
            spotEl.classList.add('free');
        }

        // 5. Zapisz nowy stan do localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parkingData));
        
        // 6. Odśwież statystyki
        updateStats();
        updateCharts();

        // Jeśli to miejsce jest akurat wyświetlane w szczegółach, odśwież panel
        if (elDetId.textContent === spot.id) {
            showDetails(spot);
        }
    }

    // 6. Manualne ustawianie miejsc
    function toggleSpotStatus(spot) {
        spot.occupied = !spot.occupied;
        
        if (spot.occupied) {
            spot.plateNumber = generatePlate();
            spot.timestamp = new Date().toISOString();
        } else {
            spot.plateNumber = null;
            spot.timestamp = null;
        }

        // Aktualizuj DOM
        const spotEl = document.getElementById(`spot-${spot.id}`);
        if (spot.occupied) {
            spotEl.classList.remove('free');
            spotEl.classList.add('occupied');
        } else {
            spotEl.classList.remove('occupied');
            spotEl.classList.add('free');
        }

        // Zapisz do localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parkingData));
        
        // Odśwież statystyki i wykresy
        updateStats();
        updateCharts();
        
        // Odśwież szczegóły jeśli to miejsce jest wyświetlane
        if (elDetId.textContent === spot.id) {
            showDetails(spot);
        }
    }

    function generatePlate() {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const nums = "0123456789";
        return `W${chars[Math.floor(Math.random()*chars.length)]}${nums[Math.floor(Math.random()*nums.length)]}${nums[Math.floor(Math.random()*nums.length)]}${nums[Math.floor(Math.random()*nums.length)]}${chars[Math.floor(Math.random()*chars.length)]}`;
    }

    // 7. Tryb edycji
    const editButton = document.getElementById('toggle-edit');
    editButton.addEventListener('click', () => {
        editMode = !editMode;
        const spots = document.querySelectorAll('.spot');
        
        if (editMode) {
            editButton.textContent = "Tryb Edycji: WŁĄCZONY";
            editButton.classList.add('active');
            spots.forEach(spot => spot.classList.add('edit-mode'));
        } else {
            editButton.textContent = "Tryb Edycji: WYŁĄCZONY";
            editButton.classList.remove('active');
            spots.forEach(spot => spot.classList.remove('edit-mode'));
        }
    });

    // 8. Wykresy
    function updateCharts() {
        drawOccupancyChart();
        drawSectorChart();
        drawRevenueChart();
    }

    // Funkcja obliczająca średni czas parkowania
    function calculateAverageParkingTime() {
        let totalTime = 0;
        let occupiedCount = 0;
        const now = new Date();

        parkingData.sectors.forEach(sector => {
            sector.spots.forEach(spot => {
                if (spot.occupied && spot.timestamp) {
                    const parkTime = (now - new Date(spot.timestamp)) / (1000 * 60 * 60); // w godzinach
                    totalTime += parkTime;
                    occupiedCount++;
                }
            });
        });

        // Jeśli brak danych, użyj domyślnej wartości 2h
        return occupiedCount > 0 ? totalTime / occupiedCount : 2.0;
    }

    // Funkcja przewidująca obłożenie w ciągu dnia
    function predictOccupancyForHour(hour) {
        // Wzorzec obłożenia w ciągu dnia (0-23)
        // Godziny szczytu: 8-10, 17-19
        const currentOccupancy = calculateOccupancy(parkingData);
        const baseOccupancy = currentOccupancy / 100; // jako ułamek
        
        // Wzorce czasowe
        let multiplier = 1.0;
        
        if (hour >= 8 && hour <= 10) {
            // Poranny szczyt
            multiplier = 0.9;
        } else if (hour >= 17 && hour <= 19) {
            // Wieczorny szczyt
            multiplier = 0.85;
        } else if (hour >= 22 || hour <= 6) {
            // Noc - niskie obłożenie
            multiplier = 0.3;
        } else if (hour >= 11 && hour <= 16) {
            // Środek dnia
            multiplier = 0.7;
        } else {
            multiplier = 0.5;
        }

        // Użyj aktualnego obłożenia jako bazy i zastosuj wzorzec czasowy
        return Math.min(100, baseOccupancy * 100 * multiplier);
    }

    function drawRevenueChart() {
        const canvas = document.getElementById('revenue-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Marginesy (zwiększone dla wyższej rozdzielczości)
        const marginLeft = 100;
        const marginRight = 50;
        const marginTop = 60;
        const marginBottom = 80;
        const chartWidth = width - marginLeft - marginRight;
        const chartHeight = height - marginTop - marginBottom;
        
        // Wyczyść canvas
        ctx.clearRect(0, 0, width, height);
        
        // Oblicz przewidywane zyski dla każdej godziny (0-23)
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const totalCapacity = parkingData.sectors.reduce((sum, s) => sum + s.capacity, 0);
        const avgParkingTime = calculateAverageParkingTime();
        
        const revenueData = hours.map(hour => {
            const predictedOccupancy = predictOccupancyForHour(hour) / 100;
            const occupiedSpots = Math.floor(totalCapacity * predictedOccupancy);
            const revenue = occupiedSpots * avgParkingTime * HOURLY_RATE;
            return {
                hour: hour,
                occupancy: predictedOccupancy * 100,
                revenue: revenue
            };
        });
        
        // Znajdź maksymalną wartość dla skalowania
        const maxRevenue = Math.max(...revenueData.map(d => d.revenue));
        const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
        
        // Tło
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(marginLeft, marginTop, chartWidth, chartHeight);
        
        // Siatka pozioma
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        for (let i = 0; i <= 5; i++) {
            const y = marginTop + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(marginLeft, y);
            ctx.lineTo(marginLeft + chartWidth, y);
            ctx.stroke();
        }
        
        // Siatka pionowa (co 2 godziny)
        const stepX = chartWidth / 24;
        for (let i = 0; i <= 24; i += 2) {
            const x = marginLeft + i * stepX;
            ctx.beginPath();
            ctx.moveTo(x, marginTop);
            ctx.lineTo(x, marginTop + chartHeight);
            ctx.stroke();
        }
        
        // Rysuj obszar pod wykresem (gradient)
        const gradient = ctx.createLinearGradient(marginLeft, marginTop, marginLeft, marginTop + chartHeight);
        gradient.addColorStop(0, 'rgba(46, 204, 113, 0.3)');
        gradient.addColorStop(1, 'rgba(46, 204, 113, 0.05)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        
        revenueData.forEach((data, index) => {
            const x = marginLeft + index * stepX;
            const y = marginTop + chartHeight - (data.revenue / maxRevenue) * chartHeight;
            if (index === 0) {
                ctx.moveTo(x, marginTop + chartHeight);
                ctx.lineTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.lineTo(marginLeft + chartWidth, marginTop + chartHeight);
        ctx.closePath();
        ctx.fill();
        
        // Linia wykresu
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 4;
        ctx.beginPath();
        
        revenueData.forEach((data, index) => {
            const x = marginLeft + index * stepX;
            const y = marginTop + chartHeight - (data.revenue / maxRevenue) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Punkty na wykresie (większe dla wyższej rozdzielczości)
        ctx.fillStyle = '#2ecc71';
        revenueData.forEach((data, index) => {
            const x = marginLeft + index * stepX;
            const y = marginTop + chartHeight - (data.revenue / maxRevenue) * chartHeight;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
            // Obramowanie punktów
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
        
        // Etykiety osi Y (zyski) - większe fonty
        ctx.fillStyle = '#aaa';
        ctx.font = 'bold 18px Roboto Mono';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const value = maxRevenue - (i * maxRevenue / 5);
            const y = marginTop + (chartHeight / 5) * i;
            ctx.fillText(`${value.toFixed(0)} zł`, marginLeft - 20, y + 7);
        }
        
        // Etykiety osi X (godziny) - większe fonty
        ctx.textAlign = 'center';
        ctx.font = 'bold 16px Roboto Mono';
        for (let i = 0; i < 24; i += 2) {
            const x = marginLeft + i * stepX;
            ctx.fillText(`${i}:00`, x, marginTop + chartHeight + 35);
        }
        
        // Tytuły osi - większe fonty
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Rajdhani';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(35, marginTop + chartHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Zyski (zł)', 0, 0);
        ctx.restore();
        
        ctx.fillText('Godzina dnia', marginLeft + chartWidth / 2, height - 15);
        
        // Statystyki na wykresie - większe fonty
        ctx.fillStyle = '#2ecc71';
        ctx.font = 'bold 24px Rajdhani';
        ctx.textAlign = 'left';
        ctx.fillText(`Przewidywany dzienny zysk: ${totalRevenue.toFixed(2)} zł`, marginLeft + 15, marginTop - 15);
        
        ctx.fillStyle = '#aaa';
        ctx.font = '18px Roboto Mono';
        ctx.fillText(`Średni czas parkowania: ${avgParkingTime.toFixed(1)}h`, marginLeft + 15, marginTop + 15);
    }

    function drawOccupancyChart() {
        const canvas = document.getElementById('occupancy-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Marginesy dla etykiet (zwiększone dla wyższej rozdzielczości)
        const marginLeft = 90;
        const marginRight = 40;
        const marginTop = 50;
        const marginBottom = 60;
        const chartWidth = width - marginLeft - marginRight;
        const chartHeight = height - marginTop - marginBottom;
        
        // Wyczyść canvas
        ctx.clearRect(0, 0, width, height);
        
        if (occupancyHistory.length < 2) return;
        
        // Tło
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(marginLeft, marginTop, chartWidth, chartHeight);
        
        // Siatka pozioma (linie Y)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = marginTop + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(marginLeft, y);
            ctx.lineTo(marginLeft + chartWidth, y);
            ctx.stroke();
        }
        
        // Siatka pionowa (linie X)
        const stepX = chartWidth / (occupancyHistory.length - 1);
        for (let i = 0; i < occupancyHistory.length; i++) {
            const x = marginLeft + i * stepX;
            ctx.beginPath();
            ctx.moveTo(x, marginTop);
            ctx.lineTo(x, marginTop + chartHeight);
            ctx.stroke();
        }
        
        // Linia wykresu - grubsza dla wyższej rozdzielczości
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 4;
        ctx.beginPath();
        
        const maxValue = 100;
        
        occupancyHistory.forEach((value, index) => {
            const x = marginLeft + index * stepX;
            const y = marginTop + chartHeight - (value / maxValue) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Wypełnienie pod linią
        ctx.fillStyle = 'rgba(52, 152, 219, 0.2)';
        ctx.lineTo(marginLeft + chartWidth, marginTop + chartHeight);
        ctx.lineTo(marginLeft, marginTop + chartHeight);
        ctx.closePath();
        ctx.fill();
        
        // Punkty - większe dla wyższej rozdzielczości
        ctx.fillStyle = '#3498db';
        occupancyHistory.forEach((value, index) => {
            const x = marginLeft + index * stepX;
            const y = marginTop + chartHeight - (value / maxValue) * chartHeight;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
            // Obramowanie punktów
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
        
        // Etykiety osi Y (wartości procentowe) - większe fonty
        ctx.fillStyle = '#aaa';
        ctx.font = 'bold 18px Roboto Mono';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const value = 100 - (i * 25);
            const y = marginTop + (chartHeight / 4) * i;
            ctx.fillText(`${value}%`, marginLeft - 15, y + 7);
        }
        
        // Etykiety osi X (indeksy punktów) - większe fonty
        ctx.textAlign = 'center';
        ctx.font = 'bold 16px Roboto Mono';
        for (let i = 0; i < occupancyHistory.length; i += Math.max(1, Math.floor(occupancyHistory.length / 10))) {
            const x = marginLeft + i * stepX;
            ctx.fillText(`${i + 1}`, x, marginTop + chartHeight + 35);
        }
        
        // Tytuły osi - większe fonty
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Rajdhani';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(30, marginTop + chartHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Obłożenie (%)', 0, 0);
        ctx.restore();
        
        ctx.fillText('Czas (punkt pomiaru)', marginLeft + chartWidth / 2, height - 15);
    }

    function drawSectorChart() {
        const canvas = document.getElementById('sector-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Marginesy dla etykiet (zwiększone dla wyższej rozdzielczości)
        const marginLeft = 100;
        const marginRight = 50;
        const marginTop = 60;
        const marginBottom = 80;
        const chartWidth = width - marginLeft - marginRight;
        const chartHeight = height - marginTop - marginBottom;
        
        // Wyczyść canvas
        ctx.clearRect(0, 0, width, height);
        
        // Tło
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(marginLeft, marginTop, chartWidth, chartHeight);
        
        // Oblicz dane per sektor
        const sectorData = parkingData.sectors.map(sector => {
            const occupied = sector.spots.filter(s => s.occupied).length;
            const percent = (occupied / sector.capacity) * 100;
            return {
                name: sector.name,
                occupied: occupied,
                total: sector.capacity,
                percent: percent
            };
        });
        
        // Siatka pozioma
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = marginTop + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(marginLeft, y);
            ctx.lineTo(marginLeft + chartWidth, y);
            ctx.stroke();
        }
        
        // Rysuj słupki
        const barWidth = chartWidth / sectorData.length;
        const colors = ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71'];
        
        sectorData.forEach((data, index) => {
            const barHeight = (data.percent / 100) * chartHeight;
            const x = marginLeft + index * barWidth + (barWidth * 0.15);
            const y = marginTop + chartHeight - barHeight;
            const w = barWidth * 0.7;
            
            // Słupek z gradientem
            const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
            gradient.addColorStop(0, colors[index % colors.length]);
            gradient.addColorStop(1, colors[index % colors.length] + '80');
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, w, barHeight);
            
            // Obramowanie - grubsze dla wyższej rozdzielczości
            ctx.strokeStyle = colors[index % colors.length];
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, w, barHeight);
            
            // Etykieta wartości na słupku - większe fonty
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 22px Roboto Mono';
            ctx.textAlign = 'center';
            if (barHeight > 30) {
                ctx.fillText(`${data.occupied}/${data.total}`, x + w/2, y - 12);
                ctx.font = '18px Roboto Mono';
                ctx.fillText(`${data.percent.toFixed(1)}%`, x + w/2, y - 35);
            }
            
            // Nazwa sektora na osi X - większe fonty
            ctx.fillStyle = '#aaa';
            ctx.font = 'bold 18px Rajdhani';
            ctx.fillText(data.name, x + w/2, marginTop + chartHeight + 40);
        });
        
        // Oś Y (linia)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(marginLeft, marginTop);
        ctx.lineTo(marginLeft, marginTop + chartHeight);
        ctx.stroke();
        
        // Etykiety osi Y (wartości procentowe) - większe fonty
        ctx.fillStyle = '#aaa';
        ctx.font = 'bold 18px Roboto Mono';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const value = 100 - (i * 25);
            const y = marginTop + (chartHeight / 4) * i;
            ctx.fillText(`${value}%`, marginLeft - 20, y + 7);
        }
        
        // Tytuły osi - większe fonty
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Rajdhani';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(35, marginTop + chartHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Obłożenie (%)', 0, 0);
        ctx.restore();
        
        ctx.fillText('Sektory', marginLeft + chartWidth / 2, height - 15);
    }

    // 9. Automatyczne odświeżanie czasu zajęcia i kwoty
    setInterval(() => {
        // Jeśli miejsce jest wyświetlane i jest zajęte, odśwież szczegóły
        const currentSpotId = elDetId.textContent;
        if (currentSpotId && currentSpotId !== '---') {
            // Znajdź miejsce w danych
            for (const sector of parkingData.sectors) {
                const spot = sector.spots.find(s => s.id === currentSpotId);
                if (spot && spot.occupied) {
                    showDetails(spot);
                    break;
                }
            }
        }
    }, 1000); // Odświeżaj co sekundę

    // Start - inicjalizacja danych i renderowanie
    loadData();
    
    // Inicjalizuj wykresy po załadowaniu
    setTimeout(() => {
        updateCharts();
        // Aktualizuj wykresy co 3 sekundy (jeśli symulacja nie działa)
        setInterval(() => {
            if (!simulationInterval) {
                updateCharts();
            }
        }, 3000);
    }, 100);
});