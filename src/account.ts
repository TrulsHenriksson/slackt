import { supabase } from './supabase.ts';

const openButton = document.getElementById('open')!;
const saveButton = document.getElementById('save')!;
const clearButton = document.getElementById('clear')!;
const userInfo = document.getElementById('userInfo')!;
const signupForm = document.getElementById('signupForm') as HTMLFormElement;
const loginForm = document.getElementById('loginForm') as HTMLFormElement;
const getInfo = document.getElementById('getInfo')!;

[openButton, saveButton, clearButton, userInfo, signupForm, getInfo].forEach(
    (element) => {
        if (!element) throw new Error();
    },
);

async function updateUserInfo() {
    console.log('updateUserInfo called');

    const { data, error } = await supabase.auth.getSession();
    if (error) {
        userInfo.innerHTML = 'Error: ' + error.message;
        return;
    }

    if (data.session) {
        userInfo.innerHTML = `Inloggad som: ${data.session.user.email}`;
    } else {
        userInfo.innerHTML = 'Inte inloggad';
    }
}

supabase.auth.onAuthStateChange(() => {
    updateUserInfo();
});

await updateUserInfo();

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(signupForm);

    const { data, error } = await supabase.auth.signUp({
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    });

    console.log(data);
    console.log(error);
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(loginForm);

    const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    });

    console.log(data);
    console.log(error);
});

getInfo.onclick = async () => {
    const { data, error } = await supabase.auth.getSession();
    console.log(data.session);
};
