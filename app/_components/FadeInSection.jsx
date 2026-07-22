"use client";

import { motion } from "framer-motion";

const fadeInUp = {
	hidden: { opacity: 0, y: 16 },
	visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

export function FadeInSection({ as = "div", className, children }) {
	const MotionTag = motion[as];

	return (
		<MotionTag
			className={className}
			initial="hidden"
			whileInView="visible"
			viewport={{ once: true, amount: 0.2 }}
			variants={fadeInUp}
		>
			{children}
		</MotionTag>
	);
}
