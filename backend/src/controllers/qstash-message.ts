import { Client, Receiver } from "@upstash/qstash";
import { type Context } from "hono";
import { sendEmail } from "../utils/resend.ts";

const receiver = new Receiver({
	currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
	nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

const qstashClient = new Client({
	token: process.env.QSTASH_TOKEN,
});

export const qstash_message = async (c: Context) => {
	try {
		const signature = c.req.raw.headers.get("Upstash-Signature");
		const rawBody = await c.req.text();
		const body = JSON.parse(rawBody);
		// console.log(body);

		const isValid = await receiver.verify({
			body: rawBody,
			signature,
			url: "https://biva-bakery-backend.onrender.com/qstash-message",
			// https://biva-bakery-backend.onrender.com/qstash-message
		});

		// console.log(isValid);

		if (isValid) {
			const userData = body;
			const email = await qstashClient.publishJSON({
				// url: "https://biva-bakery-backend.onrender.com/send-email",
				url: "https://biva-bakery-backend.onrender.com/send-email",
				body: {
					userData,
				},
				retries: 3,
			});

			// const email = await sendEmail(
			//   userData.userId,
			//   userData.userName,
			//   userData.userTotalAmount,
			//   userData.userEmail,
			//   userData.userPreference,
			//   userData.userTotalPeople,
			//   userData.userTimeSlot,
			//   "invoice",
			// );

			// console.log("qstash got it ", email);
			return c.json(
				{ message: "recieved in server and mail sent!", data: body },
				200,
			);
		} else {
			return c.json({ message: "error!" }, 400);
		}
	} catch (err) {
		return c.json({ error: err }, 400);
	}
};
