import { supabase } from './supabase.ts';

const openButton = document.getElementById('open')!;
const saveButton = document.getElementById('save')!;
const clearButton = document.getElementById('clear')!;
const signupForm = document.getElementById('signupForm') as HTMLFormElement;

[openButton, saveButton, clearButton, signupForm].forEach((element) => {
    if (!element) throw new Error();
});

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
