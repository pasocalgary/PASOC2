import { HeroSection } from "@/app/(Navigation)/(Members)/UI/HeroSection";
import Image from "next/image";

async function getOfficers() {
	try {
		const baseURL =
			process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

		const res = await fetch(`${baseURL}/api/about`, {
			cache: "no-store",
		});

		if (!res.ok) {
			throw new Error("Failed to fetch officers");
		}

		const data = await res.json();

		return data.data || [];
	} catch (error) {
		console.error("Officer fetch error:", error);

		return [];
	}
}

export default async function AboutUs() {
	const officers = await getOfficers();


	return (
		<main>
			<HeroSection title="About PASOC" description=" " />

			<section className="px-6 py-14">
				<div className="max-w-6xl mx-auto grid lg:grid-cols-[1.4fr_0.8fr] gap-6 items-stretch">
					<article className="rounded-3xl border border-[#d8d2c4] bg-[#f7f4ec] p-8 md:p-10 shadow-[0_18px_40px_rgba(0,0,0,0.08)]">
						<p className="inline-flex items-center rounded-full bg-[#556B2F] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white mb-5">
							Established 1988
						</p>

						<h2 className="text-3xl md:text-4xl font-bold text-black leading-tight mb-5">
							Who We Are
						</h2>

						<p className="text-lg text-black leading-relaxed">
							The Pangasinan Society of Calgary (PASOC) was
							established in 1988 to bring together Pangasinenses
							and friends in Calgary. It was founded by Leopoldo
							&quot;Pol&quot; Mendoza and a group of dedicated
							community members, and officially registered under
							Alberta&apos;s Societies Act on October 6, 1988.
						</p>

						<p className="text-lg text-black leading-relaxed mt-4">
							Since its founding, PASOC has grown from a small
							group of 30 members to over 600 members today.
							Membership is open to everyone: Pangasinenses, other
							Filipinos, and non-Filipinos alike.
						</p>
					</article>

					<aside className="grid gap-4 lg:h-full">
						<div className="relative h-56 md:h-64 lg:h-full overflow-hidden rounded-2xl border border-[#d8d2c4] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
							<Image
								src="/PasocLeadership2012_01.jpg"
								alt="PASOC Leadership"
								fill
								sizes="(min-width: 1024px) 33vw, 100vw"
								className="object-cover"
							/>
						</div>
					</aside>
				</div>
			</section>

			{/* OFFICERS */}
			<section className="bg-neutral-100 w-full mt-12 px-6 py-14">
				<div className="max-w-6xl mx-auto">
					<div className="text-center">
						<p className="inline-flex items-center rounded-full bg-[#556B2F] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white mb-4">
							Leadership Team
						</p>
						<h2 className="text-3xl md:text-4xl font-bold text-black">
							PASOC Officers
						</h2>
					</div>

					<div className="w-full mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-10">
						{officers.map((officer) => (
							<article
								key={officer.officerId}
								className="rounded-2xl border border-[#d8d2c4] bg-white p-6 shadow-[0_12px_28px_rgba(0,0,0,0.07)]"
							>
								<div className="flex items-center gap-4">
									<div className="w-16 h-16 rounded-xl bg-[#dde4cf] text-[#556B2F] flex items-center justify-center text-lg font-bold">
										{(officer.name || "?")
											.charAt(0)
											.toUpperCase()}
									</div>

									<div className="min-w-0">
										<h3 className="text-xl font-semibold text-black leading-tight truncate">
											{officer.name}
										</h3>
										<p className="text-sm text-[#556B2F] font-medium mt-1">
											{officer.occupation}
										</p>
									</div>
								</div>
							</article>
						))}
					</div>
				</div>
			</section>
		</main>
	);
}
