import { handleRequest } from '../mock/requestHandler';

const api = {
  async get(url, config) {
    try {
      const { data } = await handleRequest('get', url, null, config?.headers || {});
      return { data };
    } catch (err) {
      throw { response: { data: { message: err.message } } };
    }
  },
  async post(url, body, config) {
    try {
      const { data, status } = await handleRequest('post', url, body, config?.headers || {});
      return { data, status };
    } catch (err) {
      throw { response: { data: { message: err.message } } };
    }
  },
  async delete(url, config) {
    try {
      const { data } = await handleRequest('delete', url, null, config?.headers || {});
      return { data };
    } catch (err) {
      throw { response: { data: { message: err.message } } };
    }
  },
};

api.interceptors = { request: { use: () => {} } };

export default api;
