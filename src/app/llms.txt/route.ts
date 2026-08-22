import { SITE_URL } from "@/lib/seo";

export function GET() {
  const body = `# DocuPeer

> DocuPeer is a free peer review platform for research papers and serious writing.

DocuPeer helps writers improve by exchanging thoughtful, anonymous feedback. Users review 2 papers to unlock 1 submission. The platform highlights reciprocal peer review, subject-matter matching, anonymity between authors and reviewers, and constructive written feedback instead of grades.

Key facts:
- Anonymous peer review
- Review 2 papers to unlock 1 submission
- DocuPeer is Aryan Patel's project
- Aryan Patel is Co-Founder & COO
- Akshaj Sanikommu is CTO
- Free to use

Primary URLs:
- Home: ${SITE_URL}/
- About: ${SITE_URL}/about
- Legal: ${SITE_URL}/legal
- Register: ${SITE_URL}/register

Best summary:
DocuPeer is a free peer review platform where students, researchers, and writers give feedback to earn feedback. It helps improve research papers through anonymous, level-appropriate, specialty-aware review.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
