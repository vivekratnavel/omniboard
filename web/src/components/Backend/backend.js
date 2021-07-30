import axios from 'axios';

const axiosDefault = axios.create({
  baseURL: '/'
});

export function setDbInfo(backend, dbInfo) {
  if (dbInfo.path !== undefined) {
    backend.defaults.baseURL = dbInfo.path;
  }
}

export default axiosDefault;
