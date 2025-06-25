import os
import requests
from bs4 import BeautifulSoup
from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore

app = Flask(__name__)
CORS(app) # Enable CORS for all origins, adjust in production

# --- Firebase Admin SDK Initialization (for accessing user posts from Firestore) ---
# IMPORTANT: Replace with the path to your Firebase Admin SDK private key JSON file.
# You can generate this from Firebase Console -> Project settings -> Service accounts.
# Make sure this file is kept secure and NOT committed to public repositories.
# For local development, you can place it in the same directory as this script.
FIREBASE_ADMIN_SDK_PATH = 'path/to/your/firebase-adminsdk.json' # <--- REPLACE THIS PATH

# Only initialize if not already initialized
if not firebase_admin._apps:
    try:
        cred = credentials.Certificate(FIREBASE_ADMIN_SDK_PATH)
        firebase_admin.initialize_app(cred)
        db_firestore = firestore.client()
        print("Firebase Admin SDK initialized successfully.")
    except Exception as e:
        print(f"Error initializing Firebase Admin SDK: {e}")
        db_firestore = None
else:
    db_firestore = firestore.client()


# --- Web Scraping Function ---
def scrape_sportssquarenews(url="https://sportssquarenews.com"):
    """
    Scrapes sportssquarenews.com for article titles, links, and main content/snippets.
    This is a basic scraper; complex sites with dynamic content may require more advanced tools (e.g., Selenium).
    """
    print(f"Attempting to scrape: {url}")
    scraped_articles = []
    try:
        response = requests.get(url, timeout=10) # 10 second timeout
        response.raise_for_status() # Raise an exception for HTTP errors
        soup = BeautifulSoup(response.text, 'html.parser')

        # This part is highly dependent on the actual HTML structure of sportssquarenews.com
        # You'll likely need to inspect the site's HTML to find the correct selectors.
        # Example: looking for article links within specific divs/classes
        # This is a generic example, you might need to adjust 'div.post-card' or 'h2 a'
        articles_html = soup.find_all('article') # Common tag for articles

        if not articles_html:
            print("No <article> tags found. Trying more generic selectors.")
            # Fallback if no <article> tags; might need adjustment
            articles_html = soup.find_all('a', href=True)
            articles_html = [link for link in articles_html if '/p/' in link['href'] or '/posts/' in link['href']]
            
        for i, article_tag in enumerate(articles_html):
            title_tag = article_tag.find('h2') or article_tag.find('h3') or article_tag.find('a', class_='post-title')
            link_tag = article_tag.find('a', href=True)

            if title_tag and link_tag:
                title = title_tag.get_text(strip=True)
                article_url = link_tag['href']
                # Try to get a snippet from a paragraph or description if available
                snippet_tag = article_tag.find('p') or article_tag.find('.post-snippet')
                snippet = snippet_tag.get_text(strip=True)[:200] + '...' if snippet_tag else "No snippet available."
                
                # Make sure the URL is absolute
                if not article_url.startswith('http'):
                    article_url = url.rstrip('/') + article_url # Basic absolute pathing

                # Basic check to avoid non-article links if using generic 'a' tags
                if not any(keyword in article_url for keyword in ['/p/', '/posts/']):
                    continue # Skip if it doesn't look like an article link

                scraped_articles.append({
                    "id": f"scraped-{i}-{os.path.basename(article_url).split('?')[0]}", # Generate a unique ID
                    "title": title,
                    "content": snippet, # For simplicity, snippet acts as content for filtering
                    "url": article_url,
                    "source": "sportssquarenews.com"
                })
            elif link_tag and ('/p/' in link_tag['href'] or '/posts/' in link_tag['href']):
                # Handle cases where title might be directly in the link text or not in h2/h3
                title = link_tag.get_text(strip=True) or f"Article {i+1}"
                snippet = "No explicit snippet found, linking to article."
                article_url = link_tag['href']
                if not article_url.startswith('http'):
                    article_url = url.rstrip('/') + article_url
                
                scraped_articles.append({
                    "id": f"scraped-{i}-{os.path.basename(article_url).split('?')[0]}",
                    "title": title,
                    "content": snippet,
                    "url": article_url,
                    "source": "sportssquarenews.com"
                })


    except requests.exceptions.RequestException as e:
        print(f"Error fetching {url}: {e}")
    except Exception as e:
        print(f"An unexpected error occurred during scraping: {e}")
    
    print(f"Scraped {len(scraped_articles)} articles from {url}")
    return scraped_articles

# --- Initial Scrape when the server starts (can be periodically updated in a real app) ---
all_available_articles = []
SPORTSSQUARENEWS_URL = "https://sportssquarenews.com" # Define your target URL
all_available_articles.extend(scrape_sportssquarenews(SPORTSSQUARENEWS_URL))

# --- API Endpoint for Recommendations ---
@app.route('/recommendations', methods=['POST'])
def get_recommendations():
    data = request.json
    favorite_teams = data.get('favoriteTeams', [])
    read_article_titles = data.get('readArticleTitles', [])
    user_posts_content = data.get('userPostsContent', []) # This will come from frontend Firestore read
    user_id = data.get('userId', 'anonymous')

    print(f"Received request for user {user_id}:")
    print(f"  Favorite Teams: {favorite_teams}")
    print(f"  Read Articles: {read_article_titles}")

    # Fetch user's own posts from Firestore (server-side)
    firestore_user_posts = []
    if db_firestore and user_id != 'anonymous': # Only fetch if Firebase Admin SDK is initialized and user is not anonymous
        try:
            # Query posts where uid matches the current user's uid
            posts_ref = db_firestore.collection('posts')
            query_ref = posts_ref.where('uid', '==', user_id).limit(5) # Limit to 5 recent posts for context
            docs = query_ref.stream()
            for doc_snap in docs:
                post_data = doc_snap.to_dict()
                if 'text' in post_data and post_data['text']:
                    firestore_user_posts.append(post_data['text'])
            print(f"Fetched {len(firestore_user_posts)} user posts from Firestore.")
        except Exception as e:
            print(f"Error fetching user posts from Firestore: {e}")

    # Combine all content sources for relevance matching
    all_content_for_matching = list(all_available_articles)
    # Add user's own posts to the pool of content to match against
    # You might need to give them a unique ID/structure to avoid conflicts
    for i, post_text in enumerate(firestore_user_posts):
        all_content_for_matching.append({
            "id": f"user-post-{user_id}-{i}",
            "title": post_text[:50] + "..." if len(post_text) > 50 else post_text, # Use start of post as title
            "content": post_text,
            "url": "#", # No direct URL for user's own posts from local context
            "source": "user_posts"
        })

    # Filter articles based on favorite teams and already read articles
    filtered_recommendations = []
    
    # If no favorite teams, recommend general popular articles (from scraped data or initial db)
    if not favorite_teams or favorite_teams[0].lower() == "not set yet":
        # For simplicity, recommend a few general articles or the first few scraped ones
        filtered_recommendations = all_available_articles[:5]
        print("No favorite teams set. Recommending general articles from scraped data.")
    else:
        for article in all_content_for_matching:
            # Ensure article is not already read
            if article['title'] in read_article_titles:
                continue

            # Check if any favorite team is in the article title, content, or tags (if applicable)
            is_relevant = False
            article_text = (article['title'] + " " + article.get('content', '') + " ".join(article.get('tags', []))).lower()
            for team in favorite_teams:
                if team.lower() in article_text:
                    is_relevant = True
                    break
            
            if is_relevant:
                filtered_recommendations.append(article)
    
    # Limit the number of recommendations
    final_recommendations = filtered_recommendations[:5]

    if not final_recommendations:
        return jsonify({"recommendations": [], "message": "No specific recommendations found. Try setting a favorite team!"})

    # Prepare response for frontend
    response_payload = []
    for article in final_recommendations:
        response_payload.append({
            "id": article['id'],
            "title": article['title'],
            "reason": article['content'], # Using content/snippet as the "reason" now
            "url": article['url']
        })

    return jsonify({"recommendations": response_payload})

if __name__ == '__main__':
    # For local development, use a development server.
    app.run(debug=True, port=5000)

