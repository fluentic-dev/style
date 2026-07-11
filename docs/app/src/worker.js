const prefix = '/style';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (
      url.pathname === `${prefix}/docs/getting-started/quick-start` ||
      url.pathname === `${prefix}/docs/getting-started/quick-start/`
    ) {
      url.pathname = `${prefix}/docs/learn/start-here/`;
      return Response.redirect(url.toString(), 308);
    }

    if (url.pathname !== prefix && !url.pathname.startsWith(`${prefix}/`)) {
      return new Response('Not found', { status: 404 });
    }

    url.pathname = url.pathname.slice(prefix.length) || '/';
    return env.ASSETS.fetch(new Request(url, request));
  },
};
