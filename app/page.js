"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { HeroSection } from "./(Navigation)/(Members)/UI/HeroSection";
import { FloatingButton } from "./(Navigation)/(Members)/UI/FloatingButton";
import { LatestBulletinsSection } from "./(Navigation)/(Members)/UI/LatestBulletinsSection";
import { UpcomingEventsSection } from "./(Navigation)/(Members)/UI/UpcomingEventsSection";
import { FadeInSection } from "./_components/FadeInSection";
import { useUserAuth } from "./_utils/auth-context";

export default function HomePage() {
	const router = useRouter();
	const { user, roleId, loading } = useUserAuth();
	const isMember = user && roleId && roleId !== 4;

	return (
		<main className="w-full">
			<FloatingButton />

			{/* HERO */}
			<FadeInSection>
				<HeroSection
					title="Welcome to PASOC!"
					description="Explore our community, stay informed on upcoming events, and get involved. Become a full member to access all that PASOC has to offer, or sign up for our newsletter to stay connected with community news and announcements."
				/>
			</FadeInSection>

			<FadeInSection>
				<LatestBulletinsSection />
			</FadeInSection>
			<FadeInSection>
				<UpcomingEventsSection />
			</FadeInSection>

			{/* SCHOLARSHIP FEATURE */}
			<FadeInSection
				as="section"
				className="bg-white py-32 px-6 text-neutral-900"
			>
				<div className="max-w-3xl mx-auto text-center flex flex-col gap-8">
					<h2 className="text-4xl font-bold text-primary-700">
						Scholarship & Bursary Program
					</h2>

					<p className="text-neutral-700 text-lg leading-relaxed">
						PASOC supports students demonstrating academic
						achievement, leadership, and active community
						engagement. Applications are open to eligible candidates
						in Calgary and surrounding areas.
					</p>

					<button className="bg-[#556B2F] hover:bg-primary-700 text-white font-semibold px-10 py-4 rounded-xl transition-all duration-200 shadow-sm">
						Learn More & Apply
					</button>
				</div>
			</FadeInSection>

			{/* ABOUT */}
			<FadeInSection
				as="section"
				className="bg-primary-600 py-24 px-6"
			>
				<div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
					<div
						className="flex flex-col gap-6"
						onClick={() => router.push("/About")}
					>
						<h2 className="text-4xl font-bold text-neutral-900">
							About Us
						</h2>
						<p className="text-neutral-700 leading-relaxed text-lg">
							Founded in 1988, PASOC fosters cultural pride,
							community service, and leadership among members of
							the Pangasinan and Filipino community in Calgary.
							Through annual celebrations, scholarships, and
							outreach initiatives, the organization builds
							lasting connections across generations.
						</p>
					</div>

					<Image
						src="/PasocLeadership2012_01.jpg"
						alt="PASOC Leadership 2012"
						width={800}
						height={600}
						className="w-full h-105 object-cover rounded-2xl bg-gray-300 shadow-[0_20px_50px_rgba(0,0,0,0.08)]"
					/>
				</div>
			</FadeInSection>

			{/* CTA */}
			<FadeInSection
				as="section"
				className="bg-neutral-100 py-36 px-6 text-neutral-900"
			>
				<div className="max-w-3xl mx-auto text-center flex flex-col gap-8">
					<h2 className="text-4xl font-bold">
						Join the PASOC Community
					</h2>

					<p className="text-lg opacity-90 leading-relaxed">
						Support our mission and experience meaningful cultural
						celebration, community engagement, and lifelong
						friendships.
					</p>

					{!loading && (
						isMember ? (
							<button
								onClick={() => router.push("/Events")}
								className="bg-[#556B2F] text-white border border-white px-10 py-4 rounded-xl font-semibold hover:bg-primary-700 transition-all duration-200"
							>
								View Events
							</button>
						) : (
							<button
								onClick={() => router.push("/Login/Membership")}
								className="bg-[#556B2F] text-white border border-white px-10 py-4 rounded-xl font-semibold hover:bg-primary-700 transition-all duration-200"
							>
								Become a Member
							</button>
						)
					)}
				</div>
			</FadeInSection>
		</main>
	);
}
