"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Skeleton } from "@/app/_components/Skeleton";

const containerVariants = {
	hidden: {},
	visible: {
		transition: { staggerChildren: 0.1 },
	},
};

const itemVariants = {
	hidden: { opacity: 0, y: 16 },
	visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

export function UpcomingEventsSection() {
	const router = useRouter();
	const [events, setEvents] = useState([]);
	const [isLoadingEvents, setIsLoadingEvents] = useState(true);
	const [eventsError, setEventsError] = useState("");

	useEffect(() => {
		let isMounted = true;

		const loadEvents = async () => {
			try {
				setIsLoadingEvents(true);
				setEventsError("");

				const response = await fetch("/api/events", {
					cache: "no-store",
				});
				const payload = await response.json();

				if (!response.ok) {
					throw new Error(payload.error || "Failed to load events");
				}

				if (isMounted) {
					setEvents(Array.isArray(payload.data) ? payload.data : []);
				}
			} catch (error) {
				if (isMounted) {
					setEventsError(
						error.message || "Failed to load upcoming events",
					);
				}
			} finally {
				if (isMounted) {
					setIsLoadingEvents(false);
				}
			}
		};

		loadEvents();

		return () => {
			isMounted = false;
		};
	}, []);

	const upcomingEvents = useMemo(() => {
		const now = new Date();
		const dateLineFormatter = new Intl.DateTimeFormat("en-US", {
			month: "short",
			day: "numeric",
		});
		const yearFormatter = new Intl.DateTimeFormat("en-US", {
			year: "numeric",
		});
		const timeFormatter = new Intl.DateTimeFormat("en-US", {
			hour: "numeric",
			minute: "2-digit",
		});

		return [...events]
			.map((event) => {
				const start = new Date(event?.startDatetime);

				return {
					title: event?.title || "Untitled event",
					datetime: start,
					dateLine: dateLineFormatter.format(start),
					year: yearFormatter.format(start),
					time: timeFormatter.format(start),
				};
			})
			.filter(
				(event) =>
					!Number.isNaN(event.datetime.getTime()) &&
					event.datetime > now,
			)
			.sort((left, right) => left.datetime - right.datetime)
			.slice(0, 3);
	}, [events]);

	return (
		<section className="bg-primary-50 py-24 px-6 text-neutral-900">
			<div className="max-w-6xl mx-auto flex flex-col gap-12">
				<h2 className="text-3xl font-bold text-neutral-900">
					Upcoming Events
				</h2>

				<AnimatePresence mode="wait">
					{isLoadingEvents && (
						<motion.div
							key="loading"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="flex flex-col gap-6"
						>
							{[0, 1, 2].map((index) => (
								<div
									key={index}
									className="flex flex-row items-center justify-between gap-4 rounded-xl bg-neutral-100 px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6"
								>
									<Skeleton className="h-5 w-1/2" />
									<Skeleton className="h-10 w-24 shrink-0" />
								</div>
							))}
						</motion.div>
					)}

					{!isLoadingEvents && eventsError && (
						<motion.p
							key="error"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700"
						>
							{eventsError}
						</motion.p>
					)}

					{!isLoadingEvents &&
						!eventsError &&
						upcomingEvents.length === 0 && (
							<motion.p
								key="empty"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className="text-neutral-700"
							>
								No upcoming events right now.
							</motion.p>
						)}

					{!isLoadingEvents &&
						!eventsError &&
						upcomingEvents.length > 0 && (
							<motion.div
								key="list"
								className="flex flex-col gap-6"
								initial="hidden"
								animate="visible"
								exit={{ opacity: 0 }}
								variants={containerVariants}
							>
								{upcomingEvents.map((event, index) => (
									<motion.div
										key={`${event.title}-${event.datetime.toISOString()}-${index}`}
										variants={itemVariants}
										className="flex flex-row items-center justify-between gap-4 rounded-xl bg-neutral-100 px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6"
									>
										<span className="min-w-0 text-base font-medium leading-snug text-neutral-900 sm:text-lg">
											{event.title}
										</span>
										<div className="shrink-0 text-right font-semibold text-primary-600">
											<div className="text-sm leading-tight sm:hidden">
												<div>{event.dateLine}</div>
												<div>{event.year}</div>
												<div>{event.time}</div>
											</div>
											<div className="hidden text-base sm:block md:text-lg">
												{event.dateLine}, {event.year}{" "}
												{event.time}
											</div>
										</div>
									</motion.div>
								))}
							</motion.div>
						)}
				</AnimatePresence>

				<div>
					<button
						type="button"
						onClick={() => router.push("/Events")}
						className="text-primary-700 font-semibold hover:underline"
					>
						View more events →
					</button>
				</div>
			</div>
		</section>
	);
}
