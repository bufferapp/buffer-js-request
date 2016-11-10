/**
 * Interface to send requests – thin wrapper around fetch()
 *
 * send, get and post return a Promise that resolves with a Response object
 * from which can be retrieved Body's contents.
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
 * with FormData.append
 *
 * data is an array of primitives, arrays and objects
 *
 * Example:
 * formatDataPieces({ values: [{ a: 'a', b: 'b' }] })
 * => [ ['values[0][a]', 'a'], ['values[0][b]', 'b'] ]
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
