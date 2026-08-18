import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function words(t: string) {
  return t.trim().split(/\s+/).length;
}

const P = (paras: string[]) => paras.join("\n\n");

async function main() {
  console.log("Seeding DocuPeer.");

  // Wipe (dev only) so the seed is idempotent.
  await prisma.annotation.deleteMany();
  await prisma.review.deleteMany();
  await prisma.paper.deleteMany();
  await prisma.user.deleteMany();

  const pw = await bcrypt.hash("password123", 10);

  const [maya, leo, ana, sam] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Maya Chen",
        email: "maya@example.com",
        passwordHash: pw,
        expertiseCategory: "Biology",
        specialty: "Molecular biology",
        educationLevel: "graduate",
        strength: 80,
      },
    }),
    prisma.user.create({
      data: {
        name: "Leo Martins",
        email: "leo@example.com",
        passwordHash: pw,
        expertiseCategory: "Computer Science",
        specialty: "Machine learning",
        educationLevel: "college",
        gradeYear: "Junior",
        strength: 65,
      },
    }),
    prisma.user.create({
      data: {
        name: "Ana Torres",
        email: "ana@example.com",
        passwordHash: pw,
        expertiseCategory: "Literature & Writing",
        specialty: "Comparative literature",
        educationLevel: "professor",
        strength: 90,
      },
    }),
    prisma.user.create({
      data: {
        name: "Sam Okafor",
        email: "sam@example.com",
        passwordHash: pw,
        expertiseCategory: "Economics",
        specialty: "Behavioral economics",
        educationLevel: "high_school",
        gradeYear: "12th grade",
        strength: 45,
      },
    }),
  ]);

  const papers = [
    {
      authorId: maya.id,
      title: "CRISPR Off-Target Effects in Primary Human T Cells",
      category: "Biology",
      specialty: "Molecular biology",
      educationLevel: "graduate",
      paperType: "Research Paper",
      feedbackWanted: "Is the discussion of off-target quantification rigorous enough?",
      text: P([
        "Genome editing with CRISPR-Cas9 has transformed the study of primary human immune cells, yet the specificity of editing in therapeutically relevant T-cell populations remains incompletely characterized. In this study we quantified off-target activity across a panel of guide RNAs targeting the TRAC locus, using an unbiased genome-wide assay complemented by targeted amplicon sequencing. Our central question was whether the off-target profiles observed in immortalized cell lines faithfully predict those seen in primary cells derived from multiple healthy donors.",
        "We electroporated ribonucleoprotein complexes into activated CD4+ and CD8+ T cells and measured editing outcomes at seventy-two hours. Off-target candidate sites were nominated computationally and then validated experimentally, allowing us to distinguish true editing events from sequencing artifacts. Importantly, we observed substantial donor-to-donor variability in off-target frequencies, a phenomenon that is frequently underreported when studies rely on a single cell source or a single donor.",
        "The results indicate that while on-target editing efficiency was consistently high across donors, off-target activity was both guide-dependent and donor-dependent. Two guides that appeared highly specific in a common cell line displayed measurable off-target editing in primary cells, underscoring the risk of extrapolating specificity data across cellular contexts. We further show that reducing the dose of ribonucleoprotein narrows the off-target profile with only a modest cost to on-target efficiency, suggesting a practical route to improving specificity in clinical protocols.",
        "To contextualize these observations, we compared our primary-cell measurements against matched experiments in a widely used immortalized line. The divergence was striking: sites that appeared silent in the cell line were among the most active off-target locations in several donors. This discrepancy likely reflects differences in chromatin accessibility, repair pathway activity, and the basal expression of DNA-damage response genes between transformed lines and freshly isolated cells. Any specificity claim grounded solely in cell-line data therefore risks substantial error when translated to a therapeutic context, and we caution reviewers of such studies to demand primary-cell confirmation.",
        "Taken together, these findings argue for donor-inclusive off-target profiling as a standard component of preclinical genome-editing pipelines. We propose a tiered validation framework in which computational nomination is followed by unbiased empirical mapping and then donor-spanning confirmation. Future work should extend this analysis to exhausted and memory T-cell subsets, which may exhibit chromatin states that alter accessibility at candidate off-target loci. We believe that adopting these practices will strengthen the translational credibility of T-cell engineering studies and reduce the likelihood of unanticipated genotoxicity in downstream applications.",
      ]),
    },
    {
      authorId: leo.id,
      title: "A Gentle Introduction to Attention for Sequence Models",
      category: "Computer Science",
      specialty: "Machine learning",
      educationLevel: "college",
      paperType: "Literature Review",
      feedbackWanted: "Does the intuition build clearly for someone new to the topic?",
      text: P([
        "Attention mechanisms have become a cornerstone of modern sequence modeling, but the intuition behind them is often obscured by heavy notation. This review aims to build that intuition from the ground up, starting with the limitations of recurrent networks and arriving at the scaled dot-product attention used in transformers. My goal is to make the core idea accessible to undergraduates who have completed a first course in linear algebra and machine learning.",
        "Recurrent neural networks process sequences one step at a time, carrying information forward through a hidden state. While elegant, this design struggles to preserve information across long distances, because gradients must flow through many intermediate steps. Attention sidesteps this bottleneck by allowing every position to look directly at every other position, computing a weighted average of values where the weights reflect relevance. In effect, the model learns what to focus on rather than compressing everything into a single fixed vector.",
        "The scaled dot-product formulation makes this concrete. Each token is projected into a query, a key, and a value. The similarity between a query and every key determines how much of each value contributes to the output. Dividing by the square root of the dimension keeps the dot products from growing too large, which stabilizes the softmax that turns similarities into weights. Multi-head attention repeats this process in parallel subspaces, letting the model attend to different kinds of relationships at once.",
        "A common stumbling block for newcomers is positional information. Because attention treats its inputs as an unordered set, the model has no inherent sense of sequence order, so we must inject it explicitly through positional encodings. I devote a section to explaining why sinusoidal and learned encodings both work, and how they let the same architecture handle language, audio, and other ordered data. Grounding this abstract idea in a concrete example, such as reordering the words of a sentence, helps students see exactly what the encoding preserves and why it matters.",
        "Throughout the review I emphasize worked examples and visual metaphors over proofs, because I believe intuition should precede formalism for newcomers. I also discuss common misconceptions, such as the idea that attention weights are directly interpretable as explanations. The literature is mixed on this point, and I summarize both the optimistic and skeptical positions. I conclude with pointers to accessible implementations so that readers can experiment directly, since building a small attention layer by hand remains one of the most effective ways to truly understand it.",
      ]),
    },
    {
      authorId: ana.id,
      title: "Silence as Narrative Device in Postwar Fiction",
      category: "Literature & Writing",
      specialty: "Comparative literature",
      educationLevel: "graduate",
      paperType: "Essay",
      feedbackWanted: "Is my central argument about silence too broad?",
      text: P([
        "In much postwar fiction, what remains unspoken carries as much weight as what is said. This essay examines silence not as a mere absence of language but as an active narrative device that shapes how readers construct meaning. Across a range of authors writing in the decades after the Second World War, silence functions to mark trauma, to gesture toward the unrepresentable, and to invite the reader into an act of interpretive collaboration.",
        "Consider the way certain novels withhold the details of a catastrophic event, circling around it without ever naming it directly. This withholding is not evasion; it is a formal strategy that mirrors the psychological reality of trauma, in which the most significant experiences often resist direct articulation. By refusing to narrate the event, the text preserves its enormity and prevents it from being domesticated into ordinary language.",
        "Silence also operates at the level of character. Dialogue that trails off, questions that go unanswered, and conversations conducted through gesture rather than speech all dramatize the limits of communication. These moments ask readers to attend to subtext, to read the spaces between lines. In this sense silence democratizes interpretation, distributing meaning-making between author and reader rather than concentrating it in explicit statement.",
        "It is worth distinguishing the silences I analyze from mere brevity or omission. A telegraphic style may be terse without being silent in the sense I intend; what matters is that the gap is felt, that the text makes us aware of something deliberately withheld. This felt absence is what transforms silence from an accident of style into a meaningful gesture. When a narrator pauses at the threshold of a revelation and then turns away, the reader registers the swerve, and that registration is precisely where the work of meaning happens.",
        "My argument is that these techniques share a common ethical dimension. By declining to speak for their characters at crucial moments, these authors resist the temptation to master or explain suffering. They leave room for ambiguity, and in doing so they respect the dignity of experiences that exceed language. I acknowledge that the concept of silence risks becoming so capacious that it explains everything and therefore nothing, and I try throughout to keep my claims anchored to specific textual moments. Still, I contend that reading for silence reveals a coherent postwar aesthetic in which restraint becomes a form of testimony.",
      ]),
    },
    {
      authorId: sam.id,
      title: "Why We Overvalue Things We Already Own",
      category: "Economics",
      specialty: "Behavioral economics",
      educationLevel: "high_school",
      paperType: "Essay",
      feedbackWanted: "I'm in high school. is my explanation of the endowment effect accurate?",
      text: P([
        "People often demand much more money to give up something they own than they would have been willing to pay to acquire it in the first place. Economists call this pattern the endowment effect, and it challenges a simple assumption in traditional economics: that the value of an object should not depend on whether you happen to own it. In this essay I explain the endowment effect, describe a famous experiment that demonstrates it, and consider why it matters for everyday decisions.",
        "The classic demonstration involves coffee mugs. In the experiment, some participants are given a mug and then asked the lowest price at which they would sell it. Other participants, who do not have a mug, are asked the highest price they would pay to buy one. According to standard theory these two numbers should be roughly equal, because the mug is worth whatever it is worth. In practice, sellers consistently demand about twice as much as buyers are willing to pay.",
        "Several explanations have been proposed. One is loss aversion: losing something feels worse than gaining the equivalent thing feels good, so giving up the mug registers as a painful loss. Another is that ownership changes how we think about an object, making us notice its good qualities and imagine ourselves using it. Whatever the precise mechanism, the effect appears across many cultures and many kinds of goods, which suggests it reflects something basic about human psychology.",
        "It is also worth asking when the effect does not appear. Research suggests that experienced traders, who buy and sell goods routinely, show a much weaker endowment effect, which hints that the bias is learned and can be unlearned through practice. Goods held explicitly for exchange, like currency or tokens, also escape it, because we never really think of them as ours to keep. These exceptions matter, because they show the effect is not an iron law of human nature but a tendency shaped by context, framing, and experience.",
        "Understanding the endowment effect can make us better decision makers. It explains why people hold onto losing investments, why it is hard to declutter a closet, and why free trials are such effective sales tactics: once something feels like yours, giving it up feels like a loss. I argue that simply being aware of this bias can help us pause and ask whether we truly value something or merely value the fact that we already have it. Recognizing the difference is a small but powerful step toward clearer thinking.",
      ]),
    },
  ];

  for (const p of papers) {
    const wc = words(p.text);
    if (wc < 350) {
      throw new Error(
        `Seed paper "${p.title}" has ${wc} words (< 350 minimum). Fix the seed data.`
      );
    }
    await prisma.paper.create({
      data: { ...p, wordCount: wc },
    });
  }

  console.log(
    `Seeded ${await prisma.user.count()} users and ${await prisma.paper.count()} papers.`
  );
  console.log("Demo login: maya@example.com / password123 (also leo@, ana@, sam@)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
