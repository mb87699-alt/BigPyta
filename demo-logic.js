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

    let parkingData = null;
    let simulationInterval = null;

    // 1. Ładowanie danych
    function loadData() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            parkingData = JSON.parse(raw);
            renderMap();
            updateStats();
        } else {
            alert("Brak danych demo! Uruchom najpierw stronę główną.");
            window.location.href = 'index.html';
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

                // Kliknięcie w miejsce
                spotDiv.addEventListener('click', () => showDetails(spot));
                
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
            
            // Formatowanie czasu (tylko godzina dla czytelności)
            const date = new Date(spot.timestamp);
            elDetTime.textContent = date.toLocaleTimeString();
        } else {
            elDetStatus.textContent = "WOLNE";
            elDetStatus.style.color = "var(--success-color)";
            elDetPlate.parentElement.style.display = 'none'; // Ukryj rejestrację
            elDetTime.textContent = "-";
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

        // Jeśli to miejsce jest akurat wyświetlane w szczegółach, odśwież panel
        if (elDetId.textContent === spot.id) {
            showDetails(spot);
        }
    }

    function generatePlate() {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const nums = "0123456789";
        return `W${chars[Math.floor(Math.random()*chars.length)]}${nums[Math.floor(Math.random()*nums.length)]}${nums[Math.floor(Math.random()*nums.length)]}${nums[Math.floor(Math.random()*nums.length)]}${chars[Math.floor(Math.random()*chars.length)]}`;
    }

    // Start
    loadData();
});