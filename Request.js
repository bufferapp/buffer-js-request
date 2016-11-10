/**
 * Interface to send requests – thin wrapper around fetch()
 *
 * send, get and post return a Promise that resolves with a Response object
 * from which can be retrieved Body's contents. They all receive the same params:
 *
 * @param {string} url - relative URL of the API endpoint, e.g. 'updates/create.json'
 * @param {object} [data] - any piece of data to send alongside the request
 * @param {object} [settings] - any additional options to pass to GlobalFetch.fetch()
 *
 * Note: This util encodes data according to the multipart/form-data type, since that's
 * what most of our current endpoints expect, and it plays well with PHP. For newer
 * endpoints, esp. Node ones, it might make more sense to JSON.stringify() the data object
 * and pass it as a string through settings.body, and JSON.parse() that payload on
 * the server. Additions welcome!
 */

class Request {
  static send(url, data = {}, settings = {}) {
    const defaultSettings = {
      method: 'GET',
    };

    const dataPieces = formatDataPieces(data);

    settings = Object.assign(defaultSettings, settings);

    let queryStringParams;
    let formData;

    switch (settings.method) {
      // Attach data as query string params for GET and HEAD requests
      case 'GET':
      case 'HEAD':
        queryStringParams = dataPieces.map(([key, val]) => {
          const encodedVal = encodeURIComponent(val);
          return `${key}=${encodedVal}`;
        });

        url += '?';
        url += queryStringParams.join('&');
        break;

      // Attach data as formData on Request.body for other requests
      default:
        formData = new FormData();
        dataPieces.forEach(([key, val]) => formData.append(key, val));
        settings.body = formData;
        break;
    }

    return fetch(url, settings);
  }

  static get = (url, data, settings = {}) =>
    Request.send(url, data, Object.assign(settings, { method: 'GET' }));

  static post = (url, data, settings = {}) =>
    Request.send(url, data, Object.assign(settings, { method: 'POST' }));
}

/**
 * Split non-primitive values into primitive chunks with formatted keys to be used
 * with FormData.append()
 *
 * @param {object} [data] - map of primitives, arrays and objects
 *
 * E.g.:
 * formatDataPieces({ values: [{ a: 'a', b: 'b' }] })
 * => [ ['values[0][a]', 'a'], ['values[0][b]', 'b'] ]
 *
 * TODO: Add tests
 */
function formatDataPieces(data) {
  const dataPieces = [];

  const getValType = (val) => {
    let valType = val::Object.prototype.toString();
    valType = valType.replace(/(?:\[object |])/g, '');
    return valType;
  };

  const formatKeyVal = (key, val) => {
    const valType = getValType(val);

    switch (valType) {
      case 'Array':
        val.forEach((arrayVal, i) => {
          const arrayValType = getValType(arrayVal);

          if (arrayValType === 'Array' || arrayValType === 'Object') {
            formatKeyVal(`${key}[${i}]`, arrayVal);
          } else {
            formatKeyVal(`${key}[]`, arrayVal);
          }
        });
        break;

      case 'Object':
        Object.keys(val).forEach(objKey => formatKeyVal(`${key}[${objKey}]`, val[objKey]));
        break;

      case 'Undefined':
      case 'Function':
      case 'Symbol':
        // No-op
        break;

      // 'String', 'Number', 'Boolean', 'Null'
      default:
        dataPieces.push([key, val]);
        break;
    }
  };

  Object.keys(data).forEach(key => formatKeyVal(key, data[key]));

  return dataPieces;
}

export default Request;
