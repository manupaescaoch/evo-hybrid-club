import { createFileRoute } from "@tanstack/react-router";
import { PublicFormularioPublico } from "@/components/publico/PublicFormularioPublico";

export const Route = createFileRoute("/feedback-quinzenal")({
  head: () => ({
    meta: [
      { title: "Feedback Quinzenal | MPTEAM" },
      { name: "description", content: "Envie seu feedback quinzenal para a equipe MPTEAM." },
    ],
  }),
  component: FeedbackQuinzenalPublicaPage,
});

function FeedbackQuinzenalPublicaPage() {
  return <PublicFormularioPublico tipo="feedback_quinzenal" />;
}