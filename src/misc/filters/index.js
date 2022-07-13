// Audio Filter
import * as Volume from './audio/Volume';
import * as Loudnorm from './audio/Loudnorm';

// Video Filter
import * as Transpose from './video/Transpose';
import * as HFlip from './video/HFlip';
import * as VFlip from './video/VFlip';

// Registrate Filters by:
// type: audio/video
class Registry {
	constructor(type) {
		this.type = type;
		this.services = new Map();
	}

	Register(service) {
		if (service.type !== this.type) {
			return;
		}

		this.services.set(service.filter, service);
	}

	Get(filter) {
		const service = this.services.get(filter);
		if (service) {
			return service;
		}

		return null;
	}

	Filters() {
		return Array.from(this.services.keys());
	}

	List() {
		return Array.from(this.services.values());
	}
}

// Audio Filters
const audioRegistry = new Registry('audio');
audioRegistry.Register(Volume);
audioRegistry.Register(Loudnorm);

// Video Filters
const videoRegistry = new Registry('video');
videoRegistry.Register(Transpose);
videoRegistry.Register(HFlip);
videoRegistry.Register(VFlip);

// Export registrys for ../SelectFilters.js
export { audioRegistry as Audio, videoRegistry as Video };