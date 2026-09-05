import axios from "axios"

// 1. Create centeralised axios instance
const API = axios.create({
    baseURL:import.meta.env.VITE_API_BASE_URL,
    timeout:10000
})

// 2 Request Interceptor : Attach JWT token automatically 
API.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("access_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config;
    },
    (error) => {
        return Promise.reject(error)
    }
)

// 3 Response Intercepter : Handle Token expiry and global errors
API.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        //If backend returns 401 Unauthorized, session has expired
        if(error.response && error.response.status == 401){
            localStorage.removeItem("access_token");
            localStorage.removeItem("user_data");

        //Redirect to login only if not already on login page
        if(!window.location.pathname.includes("/login")){
            window.location.href = "/login";
        }
      }
      return Promise.reject(error);
    }
); 

export default API;

