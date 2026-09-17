import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { getImage, uploadImage } from "./controllers/image-controller.ts";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import orders from "./controllers/paymentOrder.ts";
import { getUserBookings } from "./controllers/userBookings.ts";
import verifyPayment from "./controllers/verify-payment.ts";
import { insertFoodCourt } from "./db/index.ts";
import { CloudinaryService } from "./utils/cloudinary-service.ts";
import { foodCourtForm } from "./controllers/foodCourtForm.ts";
import { bivaAiChat } from "./controllers/biva-ai.ts";
import { eventFormData } from "./controllers/eventFormData.ts";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils.js";
import { qstash_message } from "./controllers/qstash-message.ts";
import { sendEmail } from "./utils/resend.ts";
import {
	getHotelRoomDetails,
	reserveHotelRoom,
	storeUnpaidData,
} from "./controllers/hotelReservation.ts";
import announcements from "./controllers/announcements.ts";

import createTicket from "./utils/create-ticket.ts";
import { Ping } from "./controllers/ping.ts";

const app = new Hono();
app.use(secureHeaders());

const allowedOrigin = [
	"https://thebiva.com",
	"https://www.thebiva.com",
	"https://biva-bakery.onrender.com",
	"https://biva-admin.onrender.com",
	// "http://localhost:5173",
];
app.use(
	"*",
	cors({
		origin: (origin) => {
			if (!origin) {
				return "*";
			}
			if (allowedOrigin.includes(origin)) {
				return origin;
			}
			return null;
		},
		credentials: true,
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
	}),
);

export interface announce_data_type {
	title: string;
	body: string;
	displayType: string;
	image: string | File;
	styling: {
		backgroundColor: string;
		textColor: string;
		borderColor: string;
		fontSize: string;
		alignment: string;
	};
}

export let announce_data: announce_data_type = {
	title: "",
	body: "",
	displayType: "",
	image: "",
	styling: {
		backgroundColor: "",
		textColor: "",
		borderColor: "",
		fontSize: "",
		alignment: "",
	},
};

//ping route
app.get("/ping", Ping);
app.route("/announcements", announcements);
app.get("/images/:folder", getImage);
app.route("/api/orders", orders);
app.route("/api/verify-payment", verifyPayment);
app.get("/room-details/:room_type", getHotelRoomDetails);
app.post("hotels/emergency", storeUnpaidData);
app.post("/all-bookings", getUserBookings);

app.post("/qstash-message", qstash_message);
app.post("/send-email", sendEmail);
app.post("/hotel", reserveHotelRoom);

app.post("/ticket", createTicket);

app.post("/wh", async (c) => {
	const rawBody = await c.req.arrayBuffer();
	const signature = c.req.raw.headers.get("x-razorpay-signature");
	const secret = "biva";
	if (!signature || !secret) {
		return c.json({ error: "Missing signature or secret" }, { status: 400 });
	}

	const isValid = validateWebhookSignature(
		new TextDecoder().decode(rawBody),
		signature,
		secret,
	);

	if (!isValid) {
		return c.json({ error: "Invalid signature" }, { status: 401 });
	}

	let event;
	try {
		event = JSON.parse(new TextDecoder().decode(rawBody));
	} catch (err) {
		return c.json({ error: "Invalid JSON" }, { status: 400 });
	}

	if (event.event === "payment.captured") {
		const { payload } = event;
		const payment = payload.payment.entity;
		// console.log("Payment captured:", payment);
		// Handle payment captured logic here
	} else {
		// console.log("Unhandled event:", event.event);
	}

	return c.json({ message: "Event processed" });
});

app.post("/test", async (c) => {
	try {
		const data = await c.req.parseBody();
		const insertedData = await insertFoodCourt(data);
		return c.json(
			{
				message: "Food Court Table uploaded success!",
				data: insertedData,
			},
			201,
		);
	} catch (error) {
		console.error("Error at /test route", error);
		return c.json({ message: "failed to add food court" }, 500);
	}
});

app.post("/foodCourtTable", foodCourtForm);
app.post("/eventTable", eventFormData);
app.post("/biva-ai", bivaAiChat);

serve({
  fetch: app.fetch,
  port: Number(process.env.PORT || 3000),
  hostname: process.env.HOST || "0.0.0.0",
});