export const signInForm = `
    <form class="form-content" id="login-form">
        <h2>Sign In to Woorkroom</h2>
        <div class="input-group">
            <label for="email">Email Address</label>
            <input class="input" type="email" id="email"   placeholder="youremail@gmail.com" required>
            <p class="error-message" id="error-email"></p>
        </div>
        <div class="input-group">
            <label for="password">Password</label>
            <input class="input" type="password" id="password"  placeholder="********" required>
            <p class="error-message" id="error-password"></p>
        </div>
        <button type="button" class="signin-btn btn">Sign In
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M15.7903 5.3871L15.7071 5.29289L10.7071 0.292893C10.3166 -0.0976311 9.68342 -0.0976311 9.29289 0.292893C8.93241 0.653377 8.90468 1.22061 9.2097 1.6129L9.29289 1.70711L12.585 5H1C0.447715 5 0 5.44772 0 6C0 6.51284 0.38604 6.93551 0.883379 6.99327L1 7H12.585L9.29289 10.2929C8.93241 10.6534 8.90468 11.2206 9.2097 11.6129L9.29289 11.7071C9.65338 12.0676 10.2206 12.0953 10.6129 11.7903L10.7071 11.7071L15.7071 6.70711C16.0676 6.34662 16.0953 5.77939 15.7903 5.3871Z" fill="white"/>
            </svg>
        </button>
        <a type="button" id="switch-to-signup" class="link-btn">Don't have an account?</a>
    </form>
`;

export const signUpForm = `
    <form class="form-content" id="register-form">
        <h2>Create Account</h2>

        <div class="input-group">
            <label for="reg-username">User name</label>
            <input class="input" type="text" id="reg-username" placeholder="username" required>
            <p class="error-message" id="error-reg-username"></p>
        </div>

        <div class="input-group">
            <label for="reg-tel">Mobile Number</label>
            <input class="input" type="tel" id="reg-tel" maxlength="17" placeholder="+998 99 999 99 99" required>
            <p class="error-message" id="error-reg-tel"></p>
        </div>
        <div class="input-group">
            <label for="reg-email">Email Address</label>
            <input class="input" type="email" id="reg-email" placeholder="youremail@gmail.com" required>
            <p class="error-message" id="error-reg-email"></p>
        </div>
        <div class="input-group">
            <label for="reg-password">Create Password</label>
            <input class="input" type="password" id="reg-password" placeholder="********" required>
            <p class="error-message" id="error-reg-password"></p>
        </div>
        <button type="button" class="signup-btn btn">Register</button>
        <a type="button" id="switch-to-signin" class="link-btn">Already have an account?</a>
    </form>
`;




