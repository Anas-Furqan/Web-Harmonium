// MidiHandler - Web MIDI API integration for external controllers

import { eventBus, EVENTS } from '../utils/EventBus.js';

export class MidiHandler {
    constructor(audioEngine, keyboardController) {
        this.audio = audioEngine;
        this.controller = keyboardController;
        this.midiAccess = null;
        this.activeInput = null;
        this.devices = [];
        this.isSupported = false;
    }

    /**
     * Initialize MIDI access
     */
    async init() {
        if (!navigator.requestMIDIAccess) {
            console.warn('Web MIDI API not supported');
            this.updateDeviceSelect([]);
            return false;
        }

        try {
            this.midiAccess = await navigator.requestMIDIAccess();
            this.isSupported = true;

            // Setup state change listener
            this.midiAccess.onstatechange = (e) => this.handleStateChange(e);

            // Get initial devices
            this.refreshDevices();

            console.log('MIDI access granted');
            return true;
        } catch (error) {
            console.warn('MIDI access denied:', error);
            this.updateDeviceSelect([]);
            return false;
        }
    }

    /**
     * Refresh available MIDI devices
     */
    refreshDevices() {
        this.devices = [];

        if (!this.midiAccess) return;

        // Get all input devices
        for (const input of this.midiAccess.inputs.values()) {
            this.devices.push({
                id: input.id,
                name: input.name || 'Unknown Device',
                manufacturer: input.manufacturer || '',
                input
            });
        }

        this.updateDeviceSelect(this.devices);
    }

    /**
     * Handle MIDI state changes (device connect/disconnect)
     */
    handleStateChange(event) {
        console.log('MIDI state change:', event.port.name, event.port.state);
        this.refreshDevices();
    }

    /**
     * Select a MIDI input device
     */
    selectDevice(deviceId) {
        // Disconnect previous device
        if (this.activeInput) {
            this.activeInput.onmidimessage = null;
            this.activeInput = null;
        }

        if (!deviceId) return;

        // Find and connect new device
        const device = this.devices.find(d => d.id === deviceId);
        if (device) {
            this.activeInput = device.input;
            this.activeInput.onmidimessage = (e) => this.handleMidiMessage(e);
            console.log('Connected to MIDI device:', device.name);
        }
    }

    /**
     * Handle incoming MIDI messages
     */
    handleMidiMessage(event) {
        const [status, note, velocity] = event.data;

        // Extract message type and channel
        const messageType = status & 0xF0;
        const channel = status & 0x0F;

        switch (messageType) {
            case 0x90: // Note On
                if (velocity > 0) {
                    this.controller?.triggerNoteOn(note, velocity);
                } else {
                    // Note On with velocity 0 = Note Off
                    this.controller?.triggerNoteOff(note);
                }
                break;

            case 0x80: // Note Off
                this.controller?.triggerNoteOff(note);
                break;

            case 0xB0: // Control Change
                this.handleControlChange(note, velocity);
                break;

            case 0xE0: // Pitch Bend
                // Could be used for expression
                break;
        }
    }

    /**
     * Handle MIDI Control Change messages
     */
    handleControlChange(cc, value) {
        switch (cc) {
            case 1: // Modulation wheel
                // Could map to reverb or other effect
                break;

            case 7: // Volume
                const volume = value / 127;
                this.audio?.setVolume(volume);
                break;

            case 64: // Sustain pedal
                // Could implement sustain
                break;

            case 123: // All Notes Off
                this.controller?.allNotesOff();
                break;
        }
    }

    /**
     * Update the device select dropdown
     */
    updateDeviceSelect(devices) {
        const select = document.getElementById('midi-select');
        if (!select) return;

        // Clear existing options
        select.innerHTML = '';

        if (!this.isSupported) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'MIDI not supported';
            select.appendChild(option);
            select.disabled = true;
            return;
        }

        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = devices.length > 0 ? 'Select MIDI device...' : 'No MIDI devices found';
        select.appendChild(defaultOption);

        // Add device options
        devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.id;
            option.textContent = device.name;
            select.appendChild(option);
        });

        select.disabled = devices.length === 0;

        // Add change listener if not already added
        if (!select.hasAttribute('data-midi-init')) {
            select.setAttribute('data-midi-init', 'true');
            select.addEventListener('change', (e) => {
                this.selectDevice(e.target.value);
            });
        }
    }

    /**
     * Get list of available devices
     */
    getDevices() {
        return this.devices;
    }

    /**
     * Check if MIDI is supported and available
     */
    get supported() {
        return this.isSupported;
    }
}

export default MidiHandler;
