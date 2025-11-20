# Zillow FSBO Scraper
# Scrapy spider for For Sale By Owner listings

import scrapy
import time
from datetime import datetime

class ZillowSpider(scrapy.Spider):
    name = 'zillow_fsbo'
    start_urls = ['https://www.zillow.com/miami-fl/fsbo/']

    def parse(self, response):
        listings = response.css('.list-card')
        for listing in listings:
            yield {
                'address': listing.css('.list-card-addr::text').get(),
                'price': listing.css('.list-card-price::text').get(),
                'url': listing.css('a::attr(href)').get(),
                'description': listing.css('.list-card-details::text').get(),
                'scraped_at': datetime.now().isoformat()
            }

        # Slow scraping to avoid detection
        time.sleep(5)

        next_page = response.css('.search-pagination a::attr(href)').get()
        if next_page:
            yield response.follow(next_page, self.parse)