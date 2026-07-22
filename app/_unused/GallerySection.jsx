// Originally located at: app/(Navigation)/(Members)/UI/GallerySection.jsx
import * as React from "react";
import { motion } from "framer-motion";

const containerVariants = {
	hidden: {},
	visible: {
		transition: { staggerChildren: 0.15 },
	},
};

const itemVariants = {
	hidden: { opacity: 0, y: 20 },
	visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

function GalleryImage({ src, alt, title, date }) {
	return (
		<section className="flex flex-col">
			<img
				src={src}
				alt={alt}
				className="mt-2.5 w-full h-72 object-cover shadow-[0px_4px_4px_rgba(0,0,0,0.25)]"
			/>

			<div className="mt-3 flex flex-col text-center text-[20px] text-white">
				<p>{title}</p>
				<time className="mt-3" dateTime={date}>
					{date}
				</time>
			</div>
		</section>
	);
}

export function GallerySection() {
	return (
		<section className="mx-auto max-w-337.5 px-[6.75vw]">
			<header>
				<h3 className="ml-3 mt-12 font-['Instrument_Serif'] text-[28px] text-[#556B2F] underline">
					View the Gallery
				</h3>
			</header>

			<div className="mt-4 w-full rounded-3xl bg-[#84A44D] p-4 border-b-[3px] border-black">
				<motion.div
					className="flex flex-wrap gap-4"
					initial="hidden"
					whileInView="visible"
					viewport={{ once: true, amount: 0.2 }}
					variants={containerVariants}
				>
					<motion.div className="min-w-55 flex-1 basis-[30%]" variants={itemVariants}>
						<GalleryImage
							src="https://api.builder.io/api/v1/image/assets/TEMP/74f8595833948997ac27fac9cbea4be3b857a31d?placeholderIfAbsent=true&apiKey=fbbee8c7a138402fba2a2964fb2f753d"
							alt="ZUMBA FRIDAY event"
							title="ZUMBA FRIDAY!"
							date="Jan 24, 2025"
						/>
					</motion.div>

					<motion.div className="min-w-55 flex-1 basis-[30%]" variants={itemVariants}>
						<GalleryImage
							src="https://api.builder.io/api/v1/image/assets/TEMP/286d30f5302870c2585ffbd218ad49710d60141f?placeholderIfAbsent=true&apiKey=fbbee8c7a138402fba2a2964fb2f753d"
							alt="Picnic event from 2012"
							title="Picnic"
							date="2012"
						/>
					</motion.div>

					<motion.div className="min-w-55 flex-1 basis-[30%]" variants={itemVariants}>
						<GalleryImage
							src="https://api.builder.io/api/v1/image/assets/TEMP/db5cafbfa8f5042351ffe8a51a8dbbd091e92a7c?placeholderIfAbsent=true&apiKey=fbbee8c7a138402fba2a2964fb2f753d"
							alt="Youth Basketball Tournament from 2008"
							title="Youth Basketball Tournament"
							date="2008"
						/>
					</motion.div>
				</motion.div>
			</div>
		</section>
	);
}
