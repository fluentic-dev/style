import { notFound } from 'next/navigation';
import { type NextThemeId, nextThemes } from '../../../lib/theme';
import { ThemePageContent } from '../ThemePageContent';

export function generateStaticParams() {
  return nextThemes.slice(1).map((theme) => ({ serverTheme: theme.id }));
}

export default async function ThemeVariantPage(props: { params: Promise<{ serverTheme: string; }>; }) {
  const { serverTheme } = await props.params;
  const theme = nextThemes.find((item) => item.id === serverTheme);

  if (!theme) {
    notFound();
  }

  return <ThemePageContent serverThemeId={theme.id as NextThemeId} />;
}
