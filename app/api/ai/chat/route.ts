import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CreateTrip = z.object({
  title: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  location_city: z.string().optional(),
  location_country: z.string().optional(),
  attendees: z.array(z.object({ person_name: z.string().optional(), email: z.string().email() })).optional()
});

const AddFlight = z.object({
  trip_id: z.string(),
  traveler_email: z.string().email(),
  airline: z.string(),
  flight_no: z.string(),
  dep_airport: z.string(),
  arr_airport: z.string(),
  dep_time: z.string(),
  arr_time: z.string(),
  pnr: z.string().optional()
});

export async function POST(req: NextRequest) {
  const { orgId, userId, tripId, messages } = await req.json();

  const tools = [
    {
      type: "function",
      function: {
        name: "create_trip",
        description: "Create a trip with basic metadata and optional attendees",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            start_date: { type: "string", description: "YYYY-MM-DD" },
            end_date: { type: "string", description: "YYYY-MM-DD" },
            location_city: { type: "string" },
            location_country: { type: "string" },
            attendees: {
              type: "array",
              items: { type: "object", properties: { person_name: { type: "string" }, email: { type: "string" } } }
            }
          },
          required: ["title", "start_date", "end_date"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "add_flight",
        description: "Attach a flight to a trip and traveler",
        parameters: {
          type: "object",
          properties: {
            trip_id: { type: "string" },
            traveler_email: { type: "string" },
            airline: { type: "string" },
            flight_no: { type: "string" },
            dep_airport: { type: "string" },
            arr_airport: { type: "string" },
            dep_time: { type: "string" },
            arr_time: { type: "string" },
            pnr: { type: "string" }
          },
          required: ["trip_id", "traveler_email", "airline", "flight_no", "dep_airport", "arr_airport", "dep_time", "arr_time"]
        }
      }
    }
  ] as const;

  const sys = {
    role: "system",
    content: "You are the Trips Copilot. Prefer using tools when creating or updating trips. Dates should be ISO (YYYY-MM-DD). Use IATA airport codes."
  } as const;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [sys, ...messages],
    temperature: 0.2,
    tools: tools as any,
    tool_choice: "auto"
  });

  const choice = completion.choices[0];
  const toolCalls = choice.message.tool_calls;

  let reply = choice.message.content || "OK.";

  if (toolCalls && toolCalls.length > 0) {
    for (const call of toolCalls) {
      const name = call.function?.name;
      const args = call.function?.arguments ? JSON.parse(call.function.arguments) : {};

      if (name === "create_trip") {
        const parsed = CreateTrip.safeParse(args);
        if (!parsed.success) {
          reply = "I tried to create a trip but inputs were invalid.";
          continue;
        }
        const payload = parsed.data;
        const { data, error } = await supabaseAdmin.from('trips').insert([{
          org_id: orgId,
          title: payload.title,
          start_date: payload.start_date,
          end_date: payload.end_date,
          location_city: payload.location_city || null,
          location_country: payload.location_country || null,
          created_by: userId
        }]).select('id').single();
        if (error) {
          reply = `Failed to create trip: ${error.message}`;
        } else {
          reply = `Trip created with id ${data.id}.`;
        }
      }

      if (name === "add_flight") {
        const parsed = AddFlight.safeParse(args);
        if (!parsed.success) {
          reply = "I tried to add a flight but inputs were invalid.";
          continue;
        }
        const f = parsed.data;
        const { error } = await supabaseAdmin.from('flights').insert([{
          trip_id: f.trip_id || tripId,
          traveler_email: f.traveler_email,
          airline: f.airline,
          flight_no: f.flight_no,
          dep_airport: f.dep_airport,
          arr_airport: f.arr_airport,
          dep_time: f.dep_time,
          arr_time: f.arr_time,
          pnr: f.pnr || null,
        }]);
        if (error) reply = `Failed to add flight: ${error.message}`;
        else reply = `Flight ${f.airline} ${f.flight_no} added.`;
      }
    }
  }

  return NextResponse.json({ reply });
}
