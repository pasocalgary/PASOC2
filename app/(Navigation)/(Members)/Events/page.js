"use client";

import { useState, useEffect, useMemo } from "react";
import { FloatingButton } from "../UI/FloatingButton.jsx";
import { EventInformation } from "../UI/EventInformation.jsx";

async function getEvents() {
	try {
		const baseURL =
			process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
		const res = await fetch(`${baseURL}/api/Database/events`, {
			cache: "no-store",
		});
		const data = await res.json();
		return data.data || [];
	} catch (error) {
		console.error("Error fetching events:", error);
		throw error;
	}
}

export default function Events() {
	const [today, setToday] = useState(() => new Date());

	const [viewDate, setViewDate] = useState(
		new Date(today.getFullYear(), today.getMonth(), 1),
	);

	const month = viewDate.getMonth();
	const year = viewDate.getFullYear();
	const monthName = viewDate.toLocaleDateString('en-US', { month: 'long' });
	const [testEvents, setTestEvents] = useState([]);
	const [selectedEvent, setSelectedEvent] = useState(null);

	useEffect(() => {
		async function loadEvents() {
			const eventsFromApi = await getEvents();
			setTestEvents(eventsFromApi);
		}

		loadEvents();
	}, []);

	const events = useMemo(() => {
		const grouped = {};

		for (const event of testEvents) {
			if (!event.startDatetime) continue;

			const key = new Date(event.startDatetime)
				.toISOString()
				.split("T")[0];

			if (!grouped[key]) grouped[key] = [];

			grouped[key].push({
				eventId: event.eventId,
				title: event.title,
				datetime: event.startDatetime,
				date: new Date(event.startDatetime).toLocaleDateString(),
				time: new Date(event.startDatetime).toLocaleTimeString([], {
					hour: "numeric",
					minute: "2-digit",
				}),
				description: event.description,
				location: event.location,
			});
		}

		return grouped;
	}, [testEvents]);

	const upcomingEvents = useMemo(() => {
		const now = new Date();

		return testEvents
			.filter((event) => event?.startDatetime)
			.map((event) => {
				const start = new Date(event.startDatetime);

				return {
					eventId: event.eventId,
					title: event.title,
					datetime: start,
					date: start.toLocaleDateString(),
					time: start.toLocaleTimeString([], {
						hour: "numeric",
						minute: "2-digit",
					}),
					description: event.description,
					location: event.location,
				};
			})
			.filter(
				(event) =>
					!Number.isNaN(event.datetime.getTime()) &&
					event.datetime >= now,
			)
			.sort((a, b) => a.datetime - b.datetime)
			.slice(0, 10);
	}, [testEvents]);

	const todayLabel = useMemo(() => {
		const weekday = today.toLocaleDateString("en-US", {
			weekday: "long",
		});
		const monthName = today.toLocaleDateString("en-US", {
			month: "long",
		});

		return `${weekday} ${monthName} ${today.getDate()}, ${today.getFullYear()}`;
	}, [today]);

	useEffect(() => {
		const updateToday = () => setToday(new Date());
		updateToday();

		const intervalId = setInterval(updateToday, 60 * 1000);
		return () => clearInterval(intervalId);
	}, []);

	const getEventsForDay = (day) => {
		if (!day) return [];

		const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
		return events[key] || [];
	};

	const handleEventsClick = (event) => {
		setSelectedEvent(event);
	};

	const firstDay = new Date(year, month, 1).getDay();
	const daysInMonth = new Date(year, month + 1, 0).getDate();

	let weeks = [];
	let week = new Array(firstDay).fill(null);

	for (let day = 1; day <= daysInMonth; day++) {
		week.push(day);
		if (week.length === 7) {
			weeks.push(week);
			week = [];
		}
	}

	while (week.length < 7) week.push(null);
	if (!week.every((d) => d === null)) weeks.push(week);

	const prevMonth = () => {
		setViewDate(
			(prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
		);
	};

	const nextMonth = () => {
		setViewDate(
			(prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
		);
	};

	return (
		<div className="min-h-screen flex flex-col lg:flex-row gap-6 lg:gap-10 py-6 lg:py-10 mx-2 lg:mx-5 text-gray-800">
			<FloatingButton />

			<section className="w-full lg:w-auto lg:max-w-md">
				<div className="p-4 lg:p-6 bg-white rounded-lg shadow-lg">
					<h2 className="text-xl font-bold mb-4">Upcoming Events</h2>

					<div className="flex max-h-48 flex-col gap-3 overflow-y-auto pr-2 lg:max-h-128">
						{upcomingEvents.length === 0 && (
							<p className="text-sm text-gray-500">
								No upcoming events right now.
							</p>
						)}

						{upcomingEvents.map((event, index) => (
							<button
								key={`${event.eventId}-${event.title}-${index}`}
								onClick={() => handleEventsClick(event)}
								className="w-full text-left border border-gray-200 bg-gray-50 rounded-md px-3 py-2 hover:bg-[#eef3e3] hover:border-[#b8c99a] transition-colors"
							>
								<p className="text-sm font-semibold text-gray-900 truncate">
									{event.title}
								</p>
								<p className="text-xs text-gray-600 mt-1">
									{event.date} at {event.time}
								</p>
							</button>
						))}
					</div>
				</div>
			</section>

			<section className="p-3 sm:p-6 w-full lg:w-4/5 shadow-lg rounded-lg">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-bold">{monthName} {year}</h2>

					<div>
						<button
							className="px-3 py-1 bg-[#556B2F] text-white rounded hover:bg-[#6b8a3a] mx-2"
							onClick={prevMonth}
						>
							&lt;
						</button>

						<button
							className="px-3 py-1 bg-[#556B2F] text-white rounded hover:bg-[#6b8a3a] mx-2"
							onClick={nextMonth}
						>
							&gt;
						</button>
					</div>
				</div>

				<div className="grid grid-cols-7 gap-0.5 sm:gap-2 text-center font-semibold mb-2 text-xs sm:text-base">
					<div><span className="hidden sm:inline">Sun</span><span className="sm:hidden">Su</span></div>
					<div><span className="hidden sm:inline">Mon</span><span className="sm:hidden">Mo</span></div>
					<div><span className="hidden sm:inline">Tue</span><span className="sm:hidden">Tu</span></div>
					<div><span className="hidden sm:inline">Wed</span><span className="sm:hidden">We</span></div>
					<div><span className="hidden sm:inline">Thu</span><span className="sm:hidden">Th</span></div>
					<div><span className="hidden sm:inline">Fri</span><span className="sm:hidden">Fr</span></div>
					<div><span className="hidden sm:inline">Sat</span><span className="sm:hidden">Sa</span></div>
				</div>

				<div
					className="grid grid-cols-7 gap-0.5 sm:gap-2"
					style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}
				>
					{weeks.map((week, i) =>
						week.map((day, j) => {
							const dayEvents = getEventsForDay(day);

							return (
								<div
									key={`${i}-${j}`}
									className="border border-gray-300 bg-gray-50 p-1 sm:p-2 flex flex-col items-center justify-start h-16 sm:h-28 lg:h-32 overflow-hidden"
								>
									{day && (
										<>
											<span
												className={`text-xs sm:text-sm font-semibold ${
													day === today.getDate() &&
													month === today.getMonth() &&
													year === today.getFullYear()
														? "bg-[#556B2F] text-white rounded-full w-5 h-5 sm:w-8 sm:h-8 flex items-center justify-center"
														: ""
												}`}
											>
												{day}
											</span>

											<div className="mt-0.5 sm:mt-2 w-full flex flex-col gap-0.5 sm:gap-1">
												{dayEvents.map((event, idx) => (
													<div
														key={`${event.eventId}-${idx}`}
														onClick={() => handleEventsClick(event)}
														className="text-xs bg-[#dfe8ce] rounded px-1 sm:px-2 py-0.5 sm:py-1 cursor-pointer hover:bg-[#cfdcb5] w-full wrap-break-word leading-tight line-clamp-2"
													>
														{event.title}
													</div>
												))}
											</div>
										</>
									)}
								</div>
							);
						}),
					)}
				</div>

				{selectedEvent && (
					<EventInformation
						eventId={selectedEvent.eventId}
						title={selectedEvent.title}
						date={selectedEvent.date}
						time={selectedEvent.time}
						description={selectedEvent.description}
						location={selectedEvent.location}
						onClose={() => setSelectedEvent(null)}
					/>
				)}
			</section>
		</div>
	);
}