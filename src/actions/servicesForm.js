import {error} from '../util/msgs.js';
import * as actionTypes from '../constants/actionTypes';
import { ANAX_URL_BASE } from '../constants/configuration';
import * as pays from './servicesRequests';
import * as _ from 'lodash';
import HashMap from 'hashmap';

export function servicesFormFieldChange(segment, fieldName, value) {
  return dispatch => dispatch({
    type: actionTypes.SERVICES_FORM_UPDATE,
    segment: segment,
    fieldName: fieldName,
    value: value
  });
}

export function servicesFormMultiFieldChange(segment, updateObj) {
  return function(dispatch) {
    return dispatch({
      type: actionTypes.SERVICES_FORM_MULTI_UPDATE,
      updateObj: updateObj
    });
  };
}

// useGps is in here only for compat
export function servicesFormSubmit(attributes, servicesForm) {

	const loc = _.filter(attributes, (attr) => { return (attr.id === 'location' && attr.sensor_urls.length === 0); });
	if (loc.length !== 1) {
		throw error({}, 'Unexpected attributes state; looking for single location');
	}

	let doFetch = (body) => {
    return fetch(`${ANAX_URL_BASE}/microservice/config`,
			{
        method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
	}

	const promises = _.filter(_.map(servicesForm.fields, (wl, name) => {
		if (wl.enabled) {
			switch (name) {
				case 'citygram':
					return doFetch(pays.citygramService(wl.description, wl.email, wl.name, wl.password, wl.metered, 256));
					break;
				case 'cputemp':
					return doFetch(pays.cputempService(wl.metered, 128));
					break;
				case 'netspeed':
					return doFetch(pays.netspeedService(wl.testalg, wl.metered, 128));
					break;
				case 'purpleair':
					return doFetch(pays.purpleairService(wl.devicehostname, wl.metered, 128));
					break;
        case 'pws':
          const modelType = wl.modelType.split(',');
					return doFetch(pays.pwsService(wl.wugname, modelType[0], modelType[1], wl.metered, 128));
					break;
				case 'sdr':
					return doFetch(pays.sdrService(wl.metered, 128));
					break;
        case 'aural':
          return doFetch(pays.auralService(wl.sendAudio, wl.metered, 128));
				default:
					throw error({}, 'Unknown workload name', name);
			}
		}
	}), (pr) => { return !!pr; });

	// compat; only here so that it gets created at the same time as other services
	// do not meter location since it is not in the /setup/services selection list
  promises.push(doFetch(pays.locationService(loc[0].mappings.use_gps, false, 128)));

  // TODO: this will only work first-time; needs to be smarter about conflicts and such to be re-executable
  return function(dispatch) {
    return Promise.all(promises)
		.then((responses) => {

			_.each(responses, (resp, key) => {
				if (resp.ok) {
					console.log('Successful registration of service', resp);
				} else {
					throw error(resp, 'Service registration failed');
				}
			});
		});
  };
}

// Workload form submit
export function workloadAttrSubmit(attributes) {
	const doFetch = (body) => {
		return fetch(`${ANAX_URL_BASE}/workload/config`, {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify(body),
		});
	}

	const promises = _.filter(_.map(attributes.keys(), (attributeKey) => {
		const attribute = attributes.get(attributeKey);
		console.log('adding to fetch: ', pays.workloadAttrGen(attribute.workloadUrl, attribute.userInputMappings, attribute.organization));
		return doFetch(pays.workloadAttrGen(attribute.workloadUrl, attribute.userInputMappings, attribute.organization));
	}), (pr) => {return !!pr})

	return function(dispatch) {
		return Promise.all(promises)
				.then((responses) => {
					_.each(responses, (resp, key) => {
						if (resp.ok) {
							console.log('Successful workload configuration', resp);
						} else {
							throw error(resp, 'Workload Configuration failed');
						}
					});
				});
	};
}

// Microservice config
export function microserviceAttrSubmit(attributes) {
	const doFetch = (body) => {
		return fetch(`${ANAX_URL_BASE}/microservice/config`, {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify(body),
		});
	}

	const promises = _.filter(_.map(attributes.keys(), (attributeKey) => {
		const attribute = attributes.get(attributeKey);
		console.log('adding to fetch:', pays.microserviceAttrGen(attribute.specRef, attribute.sensor_name, attribute.userInputMappings, attribute.organization));
		return doFetch(pays.microserviceAttrGen(attribute.specRef, attribute.sensor_name, attribute.userInputMappings, attribute.organization));
	}), (pr) => {return !!pr})

	return function(dispatch) {
		return Promise.all(promises)
				.then((responses) => {
					_.each(responses, (resp, key) => {
						if (resp.ok) {
							console.log('Successful microservice configuration', resp);
						} else {
							throw error(resp, 'Microservice Configuration failed');
						}
					});
				});
	};
}