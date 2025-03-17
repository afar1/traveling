// App dynamic configuration
// This file is used to configure the app's behavior

export const dynamic = 'force-dynamic'; // Disable static optimization and prerendering
export const dynamicParams = true; // Dynamic route segments not included in generateStaticParams are generated on demand
export const revalidate = 0; // Disable cache and regenerate data on every request 