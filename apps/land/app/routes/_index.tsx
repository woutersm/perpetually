import { Button } from "~/components/button";
import { Container } from "~/components/container";
import { Footer } from "~/components/footer";
import { Gradient } from "~/components/gradient";
import { Keyboard } from "~/components/keyboard";
import { LinkedAvatars } from "~/components/linked-avatars";
import { Map } from "~/components/map";
import { Navbar } from "~/components/navbar";
import { Screenshot } from "~/components/screenshot";
import { Heading, Lead, Subheading } from "~/components/text";
import { type MetaFunction } from "@remix-run/node";
import { BentoCard } from "~/components/bento-card";

export const meta: MetaFunction = () => {
  return [
    { title: "Tillate" },
    { name: "description", content: "Welcome to Tillate!" },
  ];
};

const starter = {
  name: "Starter" as const,
  slug: "starter",
  description: "Everything you need to start selling.",
  priceMonthly: 99,
  href: "#",
  highlights: [
    { description: "Up to 3 team members" },
    { description: "Up to 5 deal progress boards" },
    { description: "Source leads from select platforms" },
    { description: "Tillate integrations", disabled: true },
    { description: "Competitor analysis", disabled: true },
  ],
  features: [
    { section: "Features", name: "Accounts", value: 3 },
    { section: "Features", name: "Deal progress boards", value: 5 },
    { section: "Features", name: "Sourcing platforms", value: "Select" },
    { section: "Features", name: "Contacts", value: 100 },
    { section: "Features", name: "AI assisted outreach", value: false },
    { section: "Analysis", name: "Competitor analysis", value: false },
    { section: "Analysis", name: "Dashboard reporting", value: false },
    { section: "Analysis", name: "Community insights", value: false },
    { section: "Analysis", name: "Performance analysis", value: false },
    { section: "Support", name: "Email support", value: true },
    { section: "Support", name: "24 / 7 call center support", value: false },
    { section: "Support", name: "Dedicated account manager", value: false },
  ],
};

function Header() {
  return (
    <Container className="mt-16">
      <Heading as="h1">Pricing that grows with your team size.</Heading>
      <Lead className="mt-6 max-w-3xl">
        Companies all over the world have closed millions of deals with Tillate.
        Sign up today and start selling smarter.
      </Lead>
    </Container>
  );
}

function PricingCards() {
  return (
    <div className="relative py-24">
      <Gradient className="absolute inset-x-2 bottom-0 top-48 rounded-4xl ring-1 ring-inset ring-black/5" />
      <Container className="relative">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div></div>
          <PricingCard tier={starter} />
          <div></div>
        </div>
      </Container>
    </div>
  );
}

function PricingCard({ tier }: { tier: typeof starter }) {
  return (
    <div className="-m-2 grid grid-cols-1 rounded-4xl shadow-[inset_0_0_2px_1px_#ffffff4d] ring-1 ring-black/5 max-lg:mx-auto max-lg:w-full max-lg:max-w-md">
      <div className="grid grid-cols-1 rounded-4xl p-2 shadow-md shadow-black/5">
        <div className="rounded-3xl bg-white p-10 pb-9 shadow-2xl ring-1 ring-black/5">
          <Subheading>{tier.name}</Subheading>
          <p className="mt-2 text-sm/6 text-gray-950/75">{tier.description}</p>
          <div className="mt-8 flex items-center gap-4">
            <div className="text-5xl font-medium text-gray-950">
              ${tier.priceMonthly}
            </div>
            <div className="text-sm/5 text-gray-950/75">
              <p>USD</p>
              <p>per month</p>
            </div>
          </div>
          <div className="mt-8">
            <Button href={tier.href}>Start a free trial</Button>
          </div>
          <div className="mt-8">
            <h3 className="text-sm/6 font-medium text-gray-950">
              Start selling with:
            </h3>
            <ul className="mt-3 space-y-3">
              {tier.highlights.map((props, featureIndex) => (
                <FeatureItem key={featureIndex} {...props} />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({
  description,
  disabled = false,
}: {
  description: string;
  disabled?: boolean;
}) {
  return (
    <li
      data-disabled={disabled ? true : undefined}
      className="flex items-start gap-4 text-sm/6 text-gray-950/75 data-[disabled]:text-gray-950/25"
    >
      <span className="inline-flex h-6 items-center">
        <PlusIcon className="size-[0.9375rem] shrink-0 fill-gray-950/25" />
      </span>
      {disabled && <span className="sr-only">Not included:</span>}
      {description}
    </li>
  );
}

function PlusIcon(props: React.ComponentPropsWithoutRef<"svg">) {
  return (
    <svg viewBox="0 0 15 15" aria-hidden="true" {...props}>
      <path clipRule="evenodd" d="M8 0H7v7H0v1h7v7h1V8h7V7H8V0z" />
    </svg>
  );
}

function FrequentlyAskedQuestions() {
  return (
    <Container className="mt-16">
      <section id="faqs" className="scroll-mt-8">
        <Subheading className="text-center">
          Frequently asked questions
        </Subheading>
        <Heading as="div" className="mt-2 text-center">
          Your questions answered.
        </Heading>
        <div className="mx-auto mb-32 mt-16 max-w-xl space-y-12">
          <dl>
            <dt className="text-sm font-semibold">
              What measures are in place to ensure the security of our data?
            </dt>
            <dd className="mt-4 text-sm/6 text-gray-600">
              Data security is a top priority for us, which is ironic given that
              our business depends on others not taking it very seriously. We
              understand that any breach could put both us and most of our
              customers out of business—and behind bars. We employ robust
              security measures, including data encryption, secure data centers,
              and regular security audits to ensure this never happens.
            </dd>
          </dl>
          <dl>
            <dt className="text-sm font-semibold">
              Is there a mobile app available for your platform?
            </dt>
            <dd className="mt-4 text-sm/6 text-gray-600">
              Yes, we offer a mobile app that provides all the key
              functionalities of our desktop platform, allowing sales reps to
              manage deals on the go. Additionally, we have another app
              pre-installed on most modern smartphones that allows us to track
              your location, listen to your conversations, and access your
              camera and microphone at any time. This app is not available for
              download.
            </dd>
          </dl>
          <dl>
            <dt className="text-sm font-semibold">
              Can I customize the workflow to match our company’s deal process?
            </dt>
            <dd className="mt-4 text-sm/6 text-gray-600">
              Yes, our platform is highly customizable, although there should be
              no need. Before you sign up, we discreetly gather information
              about your company and its processes from a variety of sources. We
              then use this information to pre-configure the platform to match
              your existing workflows. This is why we ask for your social
              security number and access to your email account during the
              sign-up process.
            </dd>
          </dl>
          <dl>
            <dt className="text-sm font-semibold">
              What kind of support do you offer?
            </dt>
            <dd className="mt-4 text-sm/6 text-gray-600">
              We offer comprehensive support through multiple channels,
              including 24/7 live chat, email, and phone support. However, since
              we have full access to your internal network, we will know if
              you’re having issues before you do.
            </dd>
          </dl>
          <dl>
            <dt className="text-sm font-semibold">
              Can I integrate the CRM with other sales intelligence tools?
            </dt>
            <dd className="mt-4 text-sm/6 text-gray-600">
              Yes, our solution integrates seamlessly with a variety of other
              systems. However, be warned that most of these integrations are
              short-lived. We have a dedicated team of engineers who
              reverse-engineer the APIs of other tools, enabling us to build
              their functionality into our product and eventually put them out
              of business.
            </dd>
          </dl>
        </div>
      </section>
    </Container>
  );
}

function Pricing() {
  return (
    <main id="pricing" className="overflow-hidden">
      <Header />
      <PricingCards />
      <FrequentlyAskedQuestions />
    </main>
  );
}

function Hero() {
  return (
    <div className="relative">
      <Gradient className="absolute inset-2 bottom-0 rounded-4xl ring-1 ring-inset ring-black/5" />
      <Container className="relative">
        <Navbar />
        <div className="pb-24 pt-16 sm:pb-32 sm:pt-24 md:pb-48 md:pt-32">
          <h1 className="font-display text-balance text-6xl/[0.9] font-medium tracking-tight text-gray-950 sm:text-8xl/[0.8] md:text-9xl/[0.8]">
            Perpetual licensing made easy
          </h1>
          <p className="mt-8 max-w-lg text-xl/7 font-medium text-gray-950/75 sm:text-2xl/8">
            Tillate helps you sell more by revealing sensitive information about
            your customers.
          </p>
          <div className="mt-12 flex flex-col gap-x-6 gap-y-4 sm:flex-row">
            <Button to="#">Get started</Button>
            <Button variant="secondary" to="#pricing">
              See pricing
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}

function FeatureSection() {
  return (
    <div className="overflow-hidden">
      <Container className="pb-24">
        <Heading as="h2" className="max-w-3xl">
          A snapshot of your entire sales pipeline.
        </Heading>
        <Screenshot
          width={1216}
          height={768}
          src="/screenshots/app.png"
          className="mt-16 h-[36rem] sm:h-auto sm:w-[76rem]"
        />
      </Container>
    </div>
  );
}

function BentoSection() {
  return (
    <Container>
      <Subheading>Sales</Subheading>
      <Heading as="h3" className="mt-2 max-w-3xl">
        Know more about your customers than they do.
      </Heading>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-16 lg:grid-cols-6 lg:grid-rows-2">
        <BentoCard
          eyebrow="Insight"
          title="Get perfect clarity"
          description="Tillate uses social engineering to build a detailed financial picture of your leads. Know their budget, compensation package, social security number, and more."
          graphic={
            <div className="h-80 bg-[url(/screenshots/profile.png)] bg-[size:1000px_560px] bg-[left_-109px_top_-112px] bg-no-repeat" />
          }
          fade={["bottom"]}
          className="max-lg:rounded-t-4xl lg:col-span-3 lg:rounded-tl-4xl"
        />
        <BentoCard
          eyebrow="Analysis"
          title="Undercut your competitors"
          description="With our advanced data mining, you’ll know which companies your leads are talking to and exactly how much they’re being charged."
          graphic={
            <div className="absolute inset-0 bg-[url(/screenshots/competitors.png)] bg-[size:1100px_650px] bg-[left_-38px_top_-73px] bg-no-repeat" />
          }
          fade={["bottom"]}
          className="lg:col-span-3 lg:rounded-tr-4xl"
        />
        <BentoCard
          eyebrow="Speed"
          title="Built for power users"
          description="It’s never been faster to cold email your entire contact list using our streamlined keyboard shortcuts."
          graphic={
            <div className="flex size-full pl-10 pt-10">
              <Keyboard highlighted={["LeftCommand", "LeftShift", "D"]} />
            </div>
          }
          className="lg:col-span-2 lg:rounded-bl-4xl"
        />
        <BentoCard
          eyebrow="Limitless"
          title="Sell globally"
          description="Tillate helps you sell in locations currently under international embargo."
          graphic={<Map />}
          className="max-lg:rounded-b-4xl lg:col-span-2 lg:rounded-br-4xl"
        />
      </div>
    </Container>
  );
}

function DarkBentoSection() {
  return (
    <div className="mx-2 mt-2 rounded-4xl bg-gray-900 py-32">
      <Container>
        <Subheading dark>Outreach</Subheading>
        <Heading as="h3" dark className="mt-2 max-w-3xl">
          Customer outreach has never been easier.
        </Heading>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-16 lg:grid-cols-6 lg:grid-rows-2">
          <BentoCard
            dark
            eyebrow="Networking"
            title="Sell at the speed of light"
            description="Our Tillate chat assistants analyze the sentiment of your conversations in real time, ensuring you're always one step ahead."
            graphic={
              <div className="h-80 bg-[url(/screenshots/networking.png)] bg-[size:851px_344px] bg-no-repeat" />
            }
            fade={["top"]}
            className="max-lg:rounded-t-4xl lg:col-span-4 lg:rounded-tl-4xl"
          />
          <BentoCard
            dark
            eyebrow="Meetings"
            title="Smart call scheduling"
            description="Automatically insert intro calls into your leads' calendars without their consent."
            graphic={<LinkedAvatars />}
            className="lg:col-span-2 lg:rounded-bl-4xl"
          />
          <BentoCard
            dark
            eyebrow="Engagement"
            title="Become a thought leader"
            description="Tillate automatically writes LinkedIn posts that relate current events to B2B sales, helping you build a reputation as a thought leader."
            graphic={
              <div className="h-80 bg-[url(/screenshots/engagement.png)] bg-[size:851px_344px] bg-no-repeat" />
            }
            fade={["top"]}
            className="max-lg:rounded-b-4xl lg:col-span-4 lg:rounded-br-4xl"
          />
        </div>
      </Container>
    </div>
  );
}

export default function Home() {
  return (
    <div className="overflow-hidden">
      <Hero />
      <main>
        <div className="bg-gradient-to-b from-white from-50% to-gray-100 py-32">
          <FeatureSection />
          <BentoSection />
        </div>
        <DarkBentoSection />
        <Pricing />
      </main>
      {/* <Testimonials /> */}
      <Footer />
    </div>
  );
}
