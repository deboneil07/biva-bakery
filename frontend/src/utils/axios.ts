import axios from "axios";

export const instance = axios.create({
	// baseURL: "http://localhost:4000",
	baseURL:
		import.meta.env.VITE_API_URL ||
		"https://biva-bakery-backend.onrender.com",
});
