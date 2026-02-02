# Deploying Commission Cargo

Your application is built with **Next.js** and uses **Firebase Firestore** for the database. To deploy it, you have a few excellent options.

## Option 1: Vercel (Recommended)

Vercel is the creators of Next.js and offers the easiest deployment experience.

1.  **Push your code to GitHub/GitLab/Bitbucket.**
2.  **Log in to [Vercel](https://vercel.com).**
3.  **Click "Add New..." -> "Project".**
4.  **Import your repository.**
5.  **Environment Variables:**
    Copy the values from your `.env.local` file into the Vercel Project Settings > Environment Variables.
    *   `NEXTAUTH_URL`: Your Vercel URL (e.g. `https://your-project.vercel.app`)
    *   `NEXTAUTH_SECRET`: Generate a new secret or copy the existing one.
    *   `GOOGLE_CLIENT_ID`: From Google Cloud Console.
    *   `GOOGLE_CLIENT_SECRET`: From Google Cloud Console.
    *   `FIREBASE_PROJECT_ID`: Your Firebase Project ID.
    *   `FIREBASE_CLIENT_EMAIL`: Service Account Email.
    *   `FIREBASE_PRIVATE_KEY`: Service Account Private Key.
        *   *Note:* Ensure you handle newlines in the private key correctly when pasting into Vercel.

6.  **Click "Deploy".**

## Option 2: Firebase Hosting

Since you are already using Firebase, you can host the frontend there too.

1.  **Install Firebase Tools:**
    ```bash
    npm install -g firebase-tools
    ```

2.  **Login:**
    ```bash
    firebase login
    ```

3.  **Initialize:**
    ```bash
    firebase init hosting
    ```
    *   Select your existing project.
    *   Type `npm run build` as your build command if asked.
    *   **Important:** You need to configure it to support Next.js SSR (using Cloud Functions or experimental web frameworks support).
    *   Run: `firebase experiments:enable webframeworks` before initialization for easier setup.

4.  **Deploy:**
    ```bash
    firebase deploy
    ```

**Note:** The project has been successfully built locally using `npm run build`, so the code is ready for deployment.
