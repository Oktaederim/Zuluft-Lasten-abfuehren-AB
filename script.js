document.addEventListener('DOMContentLoaded', () => {

    // DOM Elements
    const inputs = {
        roomArea: document.getElementById('roomArea'),
        roomHeight: document.getElementById('roomHeight'),
        heatingLoad: document.getElementById('heatingLoad'), // now in kW
        coolingLoad: document.getElementById('coolingLoad'), // now in kW
        roomTemp: document.getElementById('roomTemp'),
        volumeFlowSlider: document.getElementById('volumeFlowSlider')
    };

    const outputs = {
        recommendedVolumeFlow: document.getElementById('recommendedVolumeFlow'),
        volumeFlowValue: document.getElementById('volumeFlowValue'),
        supplyTempHeating: document.getElementById('supplyTempHeating'),
        supplyTempCooling: document.getElementById('supplyTempCooling'),
        heatingHint: document.getElementById('heatingHint'),
        coolingHint: document.getElementById('coolingHint'),
        flowRateInfo: document.getElementById('flowRateInfo')
    };

    const airProperties = {
        cp: 0.34 // Vereinfachter Faktor [Wh/(m³*K)]
    };

    let state = {
        totalHeatingLoadWatts: 0,
        totalCoolingLoadWatts: 0
    };

    function calculate() {
        // --- 1. Get and validate inputs ---
        const roomArea = parseFloat(inputs.roomArea.value) || 0;
        const roomHeight = parseFloat(inputs.roomHeight.value) || 0;
        const heatingLoadKW = parseFloat(inputs.heatingLoad.value) || 0;
        const coolingLoadKW = parseFloat(inputs.coolingLoad.value) || 0;

        // Store loads in Watts in the state object
        state.totalHeatingLoadWatts = heatingLoadKW * 1000;
        state.totalCoolingLoadWatts = coolingLoadKW * 1000;

        // --- 2. Calculate recommended hygienic volume flow ---
        if (roomArea > 0 && roomHeight > 0) {
            const roomVolume = roomArea * roomHeight;
            const recommendedFlow = roomVolume * 2; // Based on 2x air change rate
            outputs.recommendedVolumeFlow.textContent = `${recommendedFlow.toFixed(0)} m³/h`;

            if (isFirstCalculation()) {
                // Set slider to recommended value on first valid input
                inputs.volumeFlowSlider.value = recommendedFlow.toFixed(0);
                updateSliderMax(recommendedFlow);
            }
        } else {
            outputs.recommendedVolumeFlow.textContent = '0 m³/h';
        }
        
        // --- 3. Update displays and calculate temperatures ---
        updateVolumeFlowDisplay();
        calculateAndDisplayTemps();
    }
    
    function isFirstCalculation() {
        // Check if slider is at its initial default value and a recommendation has been calculated
        return inputs.volumeFlowSlider.value === "0" && outputs.recommendedVolumeFlow.textContent !== "0 m³/h";
    }

    function updateSliderMax(recommendedFlow) {
        // Adjust slider max range to be useful, e.g., 3x the recommended value
        // or a sensible default if there are high loads
        const loadBasedFlow = Math.max(state.totalHeatingLoadWatts, state.totalCoolingLoadWatts) / (airProperties.cp * 8); // Estimate flow for 8K deltaT
        const newMax = Math.max(1000, Math.ceil(Math.max(recommendedFlow, loadBasedFlow) * 2 / 100) * 100);
        inputs.volumeFlowSlider.max = newMax;
    }

    function updateVolumeFlowDisplay() {
        const volumeFlow = parseFloat(inputs.volumeFlowSlider.value);
        outputs.volumeFlowValue.textContent = volumeFlow;

        const roomArea = parseFloat(inputs.roomArea.value) || 0;
        const roomHeight = parseFloat(inputs.roomHeight.value) || 0;
        const roomVolume = roomArea * roomHeight;

        if (roomVolume > 0) {
            const airChangeRate = volumeFlow / roomVolume;
            outputs.flowRateInfo.textContent = `Das entspricht einer Luftwechselrate von ${airChangeRate.toFixed(2)} 1/h.`;
            outputs.flowRateInfo.className = 'info-box visible';
        } else {
            outputs.flowRateInfo.className = 'info-box';
            outputs.flowRateInfo.textContent = '';
        }
    }

    function calculateAndDisplayTemps() {
        const volumeFlow = parseFloat(inputs.volumeFlowSlider.value);
        const roomTemp = parseFloat(inputs.roomTemp.value) || 21;

        // Reset hints
        clearHints();

        if (volumeFlow === 0) {
            outputs.supplyTempHeating.textContent = '-- °C';
            outputs.supplyTempCooling.textContent = '-- °C';
            return;
        }

        // --- HEATING ---
        if (state.totalHeatingLoadWatts > 0) {
            const deltaT_heating = state.totalHeatingLoadWatts / (volumeFlow * airProperties.cp);
            const tempHeating = roomTemp + deltaT_heating;
            outputs.supplyTempHeating.textContent = `${tempHeating.toFixed(1)} °C`;
            // Add comfort hints
            if (deltaT_heating > 20) {
                showHint(outputs.heatingHint, 'KRITISCH: Sehr hohe Übertemperatur. Gefahr von starker Luftschichtung.', 'critical');
            } else if (deltaT_heating > 15) {
                 showHint(outputs.heatingHint, 'HINWEIS: Hohe Übertemperatur. Komfort kann beeinträchtigt sein.', 'warning');
            }
        } else {
            outputs.supplyTempHeating.textContent = '-- °C';
        }

        // --- COOLING ---
        if (state.totalCoolingLoadWatts > 0) {
            const deltaT_cooling = state.totalCoolingLoadWatts / (volumeFlow * airProperties.cp);
            const tempCooling = roomTemp - deltaT_cooling;
            outputs.supplyTempCooling.textContent = `${tempCooling.toFixed(1)} °C`;
            // Add comfort hints
            if (deltaT_cooling > 10) {
                showHint(outputs.coolingHint, 'KRITISCH: Sehr hohe Spreizung. Hohe Zugluftgefahr.', 'critical');
            } else if (deltaT_cooling > 8) {
                showHint(outputs.coolingHint, 'HINWEIS: Spreizung > 8K. Zugluftgefahr beachten.', 'warning');
            }
        } else {
            outputs.supplyTempCooling.textContent = '-- °C';
        }
    }
    
    function showHint(element, message, type) {
        element.textContent = message;
        element.className = `info-box visible ${type}`;
    }

    function clearHints() {
        outputs.heatingHint.className = 'info-box';
        outputs.coolingHint.className = 'info-box';
    }

    // --- Event Listeners ---
    Object.values(inputs).forEach(input => {
        input.addEventListener('input', calculate);
    });
    
    inputs.volumeFlowSlider.addEventListener('input', () => {
        updateVolumeFlowDisplay();
        calculateAndDisplayTemps();
    });

    // Initial calculation on page load
    calculate();
});
