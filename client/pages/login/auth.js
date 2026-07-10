export const signInForm = `
    <form class="form-content" id="login-form">
        <h2>Sign In</h2>
        <div class="input-group">
            <label for="email">Email Address</label>
            <input class="input" type="email" id="email"   placeholder="youremail@gmail.com" required>
            <p class="error-message" id="error-email"></p>
        </div>
        <div class="input-group">
            <label for="password">Password</label>
            <div class="password-wrapper">
                <input class="input" type="password" id="password"  placeholder="********" required>
                <button type="button" class="password-toggle" id="toggle-signin-password">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-eye-off"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                </button>
            </div>
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
    <form class="form-content" id="register-form" style="display:flex; flex-direction:column; max-width:800px; width:100%; margin-top:-20px;" autocomplete="off">
        <h2 style="text-align:center; margin-top:0; margin-bottom:32px;">Sign up</h2>

        <div style="display:flex; gap:32px; width:100%; flex-wrap:wrap; margin-bottom:24px;">
            <!-- Left Column -->
            <div style="flex:1; display:flex; flex-direction:column; gap:20px; min-width:300px;">
                <div class="input-group">
                    <label for="reg-firstname">First Name</label>
                    <input class="input" type="text" id="reg-firstname" autocomplete="off" placeholder="John" required>
                    <p class="error-message" id="error-reg-firstname"></p>
                </div>
                <div class="input-group">
                    <label for="reg-lastname">Last Name</label>
                    <input class="input" type="text" id="reg-lastname" autocomplete="off" placeholder="Doe" required>
                    <p class="error-message" id="error-reg-lastname"></p>
                </div>
                <div class="input-group">
                    <label for="reg-tel">Mobile Number</label>
                    <input class="input" type="tel" id="reg-tel" maxlength="17" autocomplete="off" placeholder="+998 90 000 00 00" required>
                    <p class="error-message" id="error-reg-tel"></p>
                </div>
            </div>

            <!-- Right Column -->
            <div style="flex:1; display:flex; flex-direction:column; gap:20px; min-width:300px;">
                <div class="input-group">
                    <label for="reg-email">Email Address</label>
                    <input class="input" type="email" id="reg-email" autocomplete="off" placeholder="email@gmail.com" required>
                    <p class="error-message" id="error-reg-email"></p>
                </div>
                <div class="input-group">
                    <label for="reg-password">Create Password</label>
                    <div class="password-wrapper">
                        <input class="input" type="text" id="reg-password" autocomplete="off" placeholder="********" required>
                        <button type="button" class="password-gen-btn" id="generate-reg-password" title="Generate Secure Password">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-key"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
                        </button>
                        <button type="button" class="password-toggle" id="toggle-reg-password">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-eye-off"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        </button>
                    </div>
                    <div id="password-validation-wrapper" class="password-validation-wrapper hidden-validation">
                        <div class="val-item invalid" id="val-length">
                            <span class="val-icon">✕</span>
                            <span class="val-text">At least 8 characters</span>
                        </div>
                        <div class="val-item invalid" id="val-uppercase">
                            <span class="val-icon">✕</span>
                            <span class="val-text">At least 1 uppercase letter (A-Z)</span>
                        </div>
                        <div class="val-item invalid" id="val-number">
                            <span class="val-icon">✕</span>
                            <span class="val-text">At least 1 number (0-9)</span>
                        </div>
                        <div class="val-item invalid" id="val-special">
                            <span class="val-icon">✕</span>
                            <span class="val-text">At least 1 special character (.-_+@#)</span>
                        </div>
                    </div>
                    <p class="error-message" id="error-reg-password"></p>
                </div>
            </div>
        </div>

        <!-- Buttons Container (Bottom Center) -->
        <div style="display:flex; flex-direction:column; align-items:center; width:100%; margin-top:24px;">
            <button type="button" class="signup-btn btn" style="width:240px; margin:0 auto;">Register</button>
            <a type="button" id="switch-to-signin" class="link-btn" style="text-align:center; padding-top: 20px;">Already have an account?</a>
        </div>
    </form>
`;




