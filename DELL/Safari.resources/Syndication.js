HTMLLinkElement.prototype.__defineGetter__("feedURL", function()
{
    // Require a relation of "alternate".
    if (this.rel !== "alternate")
        return null;

    switch (this.type) {
    case "application/atom+xml":
    case "application/x.atom+xml":
    case "application/rss+xml":
        // These types do not require other criteria.
        return this.href || null;

    case "text/xml":
    case "application/rdf+xml":
        // These types require a title that has "RSS" in it.
        if (!this.title || this.title.search(/RSS/i) === -1)
            return null;
        return this.href || null;
    }

    // Nothing matched, so this isn't a feed link.
    return null;
});

window.syndication = {
    get feeds()
    {
        var feeds = [];

        var links = document.getElementsByTagName("link");
        for (var i = 0; i < links.length; ++i) {
            var link = links[i];
            var feedURL = link.feedURL;
            if (feedURL) {
                // These property names need to be kept in-sync with SyndicationFeedLinkKeys.cpp.
                feeds.push({url: feedURL, title: link.title || null});
            }
        }

        return feeds;
    }
}
